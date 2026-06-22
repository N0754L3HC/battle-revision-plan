import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Lazy-init so a missing key returns the clean 503 below instead of crashing
// the function at module load (FUNCTION_INVOCATION_FAILED).
let _stripe;
const getStripe = () => (_stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY));
const APP_URL = process.env.APP_URL ?? 'https://beattheexam.org';

const admin = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_KEY ?? ''
);

async function getAuthUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  return error ? null : user;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Payments not configured' });
  if (!process.env.SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'Not configured' });

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { customerId } = req.body ?? {};
  if (!customerId || typeof customerId !== 'string') {
    return res.status(400).json({ error: 'Missing customerId' });
  }

  // Verify the customerId belongs to the authenticated user — prevent portal hijacking
  const { data: profile } = await admin.from('user_profiles')
    .select('stripe_customer_id').eq('id', user.id).single();
  if (!profile?.stripe_customer_id || profile.stripe_customer_id !== customerId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${APP_URL}/account`,
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err.type, err.message);
    // Surface Stripe's own message (e.g. "No configuration provided" when the
    // customer portal hasn't been activated in the Stripe dashboard) so it's
    // diagnosable instead of a generic failure.
    const isStripe = typeof err?.type === 'string' && err.type.startsWith('Stripe');
    return res.status(500).json({ error: isStripe ? `Billing portal error: ${err.message}` : 'Failed to open billing portal' });
  }
}
