import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Lazy-init so a missing key surfaces as a clean 503 from the handler guard
// below, rather than throwing at module load (which crashes the whole function
// with FUNCTION_INVOCATION_FAILED before any guard can run).
let _stripe;
const getStripe = () => (_stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY));
const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;
const APP_URL = process.env.APP_URL ?? 'https://beattheexam.org';
const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS ?? '3', 10);

const admin = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_KEY ?? ''
);

const rl = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const entry = rl.get(ip) ?? { count: 0, reset: now + 3600000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 3600000; }
  if (entry.count >= 5) return false;
  entry.count++; rl.set(ip, entry); return true;
}

async function getAuthUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  return error ? null : user;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.STRIPE_SECRET_KEY || !PRO_PRICE_ID) {
    return res.status(503).json({ error: 'Payments not configured' });
  }
  if (!process.env.SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'Not configured' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown';
  if (!rateLimit(ip)) return res.status(429).json({ error: 'Too many requests' });

  // Require auth — userId and email come from the verified JWT, not the request body
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = user.id;
  const email  = user.email;
  if (!email) return res.status(400).json({ error: 'Account has no email' });

  // The customer is ALWAYS derived from the authenticated user's own profile —
  // the request body is never trusted to choose a Stripe customer.
  const { data: profile } = await admin.from('user_profiles')
    .select('stripe_customer_id, subscription_status').eq('id', userId).single();
  const customerId = profile?.stripe_customer_id ?? null;

  // ── No double-subscriptions ────────────────────────────────────────────────
  // If the user is already a paying subscriber, refuse to open a second checkout
  // (which would create a duplicate subscription and double-charge them). Send
  // them to the billing portal instead. We check our own record first, then ask
  // Stripe directly as the source of truth (covers the window before the webhook
  // has written subscription_status).
  if (['pro', 'active', 'trialing', 'past_due'].includes(profile?.subscription_status)) {
    return res.status(409).json({ error: 'You already have an active subscription.', code: 'already_subscribed' });
  }

  try {
    const stripe = getStripe();

    if (customerId) {
      const existing = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
      const live = existing.data.find(s => ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status));
      if (live) {
        return res.status(409).json({ error: 'You already have an active subscription.', code: 'already_subscribed' });
      }
    }

    const params = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
      success_url: `${APP_URL}/account?upgraded=1`,
      cancel_url: `${APP_URL}/account`,
      client_reference_id: userId,
      metadata: { userId },
      subscription_data: {
        metadata: { userId },
        // First-time subscribers get a card-required free trial. Returning
        // customers (already have a Stripe customer on file) do NOT — one trial
        // per person, and the required card on file blocks trial-farming via
        // throwaway accounts.
        ...(!customerId && TRIAL_DAYS > 0 ? { trial_period_days: TRIAL_DAYS } : {}),
      },
      // Always collect a card, even for the trial (this is the anti-farm).
      payment_method_collection: 'always',
      allow_promotion_codes: true,
    };

    if (customerId) {
      params.customer = customerId;
    } else {
      params.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(params);
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err.type, err.code, err.message);
    // Surface Stripe's own message for config problems (e.g. a test-mode price
    // with a live key, or a missing/disabled price) so they're diagnosable
    // instead of a silent generic failure. Stripe request errors are safe to show.
    const isStripe = typeof err?.type === 'string' && err.type.startsWith('Stripe');
    return res.status(500).json({
      error: isStripe ? `Checkout failed: ${err.message}` : 'Failed to create checkout session',
    });
  }
}
