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

// Checkout requires a price_… id. Accept a price id directly, or resolve a
// product id (prod_…) to its active price. Cached after first lookup.
let _resolvedPrice;
async function resolvePriceId(stripe, id) {
  if (!id) return null;
  if (id.startsWith('price_')) return id;
  if (_resolvedPrice) return _resolvedPrice;
  if (id.startsWith('prod_')) {
    try {
      const product = await stripe.products.retrieve(id);
      let pid = product?.default_price;
      pid = typeof pid === 'string' ? pid : pid?.id;
      if (!pid) {
        const prices = await stripe.prices.list({ product: id, active: true, limit: 1 });
        pid = prices.data[0]?.id ?? null;
      }
      _resolvedPrice = pid;
      return pid;
    } catch { return null; }
  }
  return id;
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

  // Only the trial flag is read from the body; everything else comes from the JWT.
  const wantTrial = req.body?.trial === true;

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

    // Stripe Checkout needs a PRICE id (price_…). If the env var was set to a
    // PRODUCT id (prod_…) by mistake, resolve it to the product's active price
    // so checkout still works instead of failing with "No such price".
    const priceId = await resolvePriceId(stripe, PRO_PRICE_ID);
    if (!priceId) return res.status(503).json({ error: 'No active price is configured for Pro. Set STRIPE_PRO_PRICE_ID to a price_… id.' });

    // The trial is offered only when explicitly requested AND the user is a
    // first-time subscriber (no Stripe customer yet). One trial per person; the
    // required card on file blocks trial-farming via throwaway accounts.
    const applyTrial = wantTrial && !customerId && TRIAL_DAYS > 0;

    const params = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/account?upgraded=1`,
      cancel_url: `${APP_URL}/account`,
      client_reference_id: userId,
      metadata: { userId },
      subscription_data: {
        metadata: { userId },
        ...(applyTrial ? { trial_period_days: TRIAL_DAYS } : {}),
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
