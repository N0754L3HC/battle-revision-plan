import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Lazy-init so a missing key surfaces as a clean 503 from the handler guard
// below, rather than throwing at module load (which crashes the whole function
// with FUNCTION_INVOCATION_FAILED before any guard can run).
let _stripe;
const getStripe = () => (_stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY));
const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;
const APP_URL = process.env.APP_URL ?? 'https://beattheexam.org';

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

  // customerId may optionally be provided but must match the authenticated user's profile
  const { customerId: bodyCustomerId } = req.body ?? {};
  let customerId = null;

  if (bodyCustomerId) {
    const { data: profile } = await admin.from('user_profiles')
      .select('stripe_customer_id').eq('id', userId).single();
    // Reject if the claimed customerId doesn't match what we have on record
    if (profile?.stripe_customer_id && profile.stripe_customer_id !== bodyCustomerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    customerId = profile?.stripe_customer_id ?? null;
  }

  try {
    const stripe = getStripe();
    const params = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
      success_url: `${APP_URL}/account?upgraded=1`,
      cancel_url: `${APP_URL}/account`,
      client_reference_id: userId,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
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
    console.error('Checkout error:', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
