import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Lazy-init so a missing key returns a clean 503 instead of crashing at load.
let _stripe;
const getStripe = () => (_stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY));

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

  const { data: profile } = await admin.from('user_profiles')
    .select('stripe_customer_id').eq('id', user.id).single();
  const customerId = profile?.stripe_customer_id;
  if (!customerId) return res.status(400).json({ error: 'No subscription to cancel' });

  try {
    const stripe = getStripe();
    const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
    const live = subs.data.find(s => ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status));
    if (!live) return res.status(400).json({ error: 'No active subscription to cancel' });

    if (live.status === 'trialing') {
      // Cancel the trial immediately — no charge is ever taken. The webhook's
      // customer.subscription.deleted handler will set the profile back to free.
      await stripe.subscriptions.cancel(live.id);
      return res.status(200).json({ ok: true, status: 'trial_cancelled',
        message: "Your free trial is cancelled — you won't be charged." });
    }

    // Active/paid: cancel at period end so they keep the access they paid for.
    await stripe.subscriptions.update(live.id, { cancel_at_period_end: true });
    const ends = live.current_period_end
      ? new Date(live.current_period_end * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;
    return res.status(200).json({ ok: true, status: 'cancels_at_period_end',
      message: ends ? `Your subscription will end on ${ends}. You keep Pro until then.`
                    : 'Your subscription will end at the period end. You keep Pro until then.' });
  } catch (err) {
    console.error('Cancel error:', err.type, err.message);
    const isStripe = typeof err?.type === 'string' && err.type.startsWith('Stripe');
    return res.status(500).json({ error: isStripe ? `Cancel failed: ${err.message}` : 'Failed to cancel subscription' });
  }
}
