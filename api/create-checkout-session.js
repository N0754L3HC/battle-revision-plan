import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Lazy-init so a missing key surfaces as a clean 503 from the handler guard
// below, rather than throwing at module load (which crashes the whole function
// with FUNCTION_INVOCATION_FAILED before any guard can run).
let _stripe;
const getStripe = () => (_stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY));
const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;                 // monthly £8.99
const PRO_PRICE_ID_ANNUAL = process.env.STRIPE_PRO_PRICE_ID_ANNUAL;   // yearly £69.99 (optional)
const APP_URL = process.env.APP_URL ?? 'https://www.beattheexam.org';
const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS ?? '3', 10);

const admin = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_KEY ?? ''
);

const rl = new Map();
// Per-IP cap on checkout-session creation. 5/hour was tight enough that a user
// (or the founder testing) retrying a few times tripped it; opening a checkout
// is cheap and harmless, so allow a sensible number while still bounding abuse.
const CHECKOUT_PER_HOUR = parseInt(process.env.CHECKOUT_PER_HOUR || '25', 10);
function rateLimit(ip) {
  const now = Date.now();
  const entry = rl.get(ip) ?? { count: 0, reset: now + 3600000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 3600000; }
  if (entry.count >= CHECKOUT_PER_HOUR) return false;
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
const _resolvedPrice = {}; // keyed by input id, so monthly + annual don't collide
async function resolvePriceId(stripe, id) {
  if (!id) return null;
  if (id.startsWith('price_')) return id;
  if (_resolvedPrice[id]) return _resolvedPrice[id];
  if (id.startsWith('prod_')) {
    try {
      const product = await stripe.products.retrieve(id);
      let pid = product?.default_price;
      pid = typeof pid === 'string' ? pid : pid?.id;
      if (!pid) {
        const prices = await stripe.prices.list({ product: id, active: true, limit: 1 });
        pid = prices.data[0]?.id ?? null;
      }
      _resolvedPrice[id] = pid;
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

  // Only the trial flag + plan choice are read from the body; everything else
  // comes from the JWT.
  const wantTrial = req.body?.trial === true;
  const wantAnnual = req.body?.plan === 'annual' && !!PRO_PRICE_ID_ANNUAL;

  // The customer is ALWAYS derived from the authenticated user's own profile —
  // the request body is never trusted to choose a Stripe customer.
  const { data: profile } = await admin.from('user_profiles')
    .select('stripe_customer_id, subscription_status').eq('id', userId).single();
  let customerId = profile?.stripe_customer_id ?? null;

  // Fast reject if our own record already says they're subscribed.
  if (['pro', 'active', 'trialing', 'past_due'].includes(profile?.subscription_status)) {
    return res.status(409).json({ error: "You're already on Pro.", code: 'already_subscribed' });
  }

  try {
    const stripe = getStripe();

    // Ensure EXACTLY ONE Stripe customer per user, persisted before checkout.
    // Without this, the customer_email path makes Stripe mint a fresh customer on
    // every click → duplicate customers → duplicate subscriptions (double charge)
    // and an unreliable trial. Creating + saving the customer once fixes both.
    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { userId } });
      customerId = customer.id;
      await admin.from('user_profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    // Source of truth: does this customer already have a live subscription?
    const existing = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
    const live = existing.data.find(s => ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status));
    if (live) {
      // Covers rapid double-clicks AND "switch to paid while still in trial" —
      // never open a second checkout or take a second payment.
      return res.status(409).json({ error: "You're already on Pro.", code: 'already_subscribed' });
    }

    // Stripe Checkout needs a PRICE id (price_…). If the env var was set to a
    // PRODUCT id (prod_…) by mistake, resolve it to the product's active price.
    const priceId = await resolvePriceId(stripe, wantAnnual ? PRO_PRICE_ID_ANNUAL : PRO_PRICE_ID);
    if (!priceId) return res.status(503).json({ error: 'No active price is configured for Pro. Set STRIPE_PRO_PRICE_ID to a price_… id.' });

    // Trial only when explicitly requested AND this customer has NEVER had any
    // subscription before. One trial per person; the required card blocks farming.
    // The annual plan is a direct commitment, so no trial on it.
    const everSubscribed = existing.data.length > 0;
    const applyTrial = wantTrial && !wantAnnual && !everSubscribed && TRIAL_DAYS > 0;

    const params = {
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
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
