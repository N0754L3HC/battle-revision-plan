import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_KEY ?? ''
);

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).json({ error: 'Missing stripe-signature header' });

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription' || session.payment_status !== 'paid') break;
        const userId = session.metadata?.userId ?? session.client_reference_id;
        if (!userId) { console.error('checkout.session.completed: no userId in metadata'); break; }
        const { error } = await supabase.from('user_profiles').update({
          stripe_customer_id: session.customer,
          subscription_status: 'pro',
          subscription_id: session.subscription,
        }).eq('id', userId);
        if (error) console.error('Supabase update error (checkout.session.completed):', error.message);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const status = sub.status === 'active' || sub.status === 'trialing' ? 'pro' : 'free';
        const { error } = await supabase.from('user_profiles').update({
          subscription_status: status,
          subscription_id: sub.id,
        }).eq('stripe_customer_id', sub.customer);
        if (error) console.error('Supabase update error (subscription.updated):', error.message);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const { error } = await supabase.from('user_profiles').update({
          subscription_status: 'free',
          subscription_id: null,
        }).eq('stripe_customer_id', sub.customer);
        if (error) console.error('Supabase update error (subscription.deleted):', error.message);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const { error } = await supabase.from('user_profiles').update({
          subscription_status: 'past_due',
        }).eq('stripe_customer_id', invoice.customer);
        if (error) console.error('Supabase update error (invoice.payment_failed):', error.message);
        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err.message);
    return res.status(500).json({ error: 'Internal handler error' });
  }
}
