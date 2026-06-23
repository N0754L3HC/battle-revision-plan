import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

// Lazy-init so a missing key returns a clean 503 instead of crashing at module
// load (FUNCTION_INVOCATION_FAILED).
let _stripe;
const getStripe = () => (_stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY));
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
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Payments not configured' });
  }
  if (!process.env.SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'Not configured' });

  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).json({ error: 'Missing stripe-signature header' });

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = getStripe().webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
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

        // Distinguish a free-trial sub from a paying one so usage can be capped
        // tighter for trials (they aren't paying yet). 'trialing' vs 'pro'.
        let _status = 'pro';
        try {
          const sub0 = await getStripe().subscriptions.retrieve(session.subscription);
          if (sub0?.status === 'trialing') _status = 'trialing';
        } catch (e) { console.error('checkout: subscription retrieve failed:', e.message); }

        // Record the surviving subscription FIRST, so that when the duplicate
        // cleanup below fires customer.subscription.deleted events, the deleted
        // handler sees subscription_id already points at the survivor and ignores
        // them (it only downgrades the tracked subscription).
        const { error } = await supabase.from('user_profiles').update({
          stripe_customer_id: session.customer,
          subscription_status: _status,
          subscription_id: session.subscription,
        }).eq('id', userId);
        if (error) console.error('Supabase update error (checkout.session.completed):', error.message);

        // Belt-and-braces against duplicate subscriptions: if a race created more
        // than one subscription on this customer, keep the one we just activated
        // and cancel the rest so the user is never charged twice.
        try {
          const others = await getStripe().subscriptions.list({ customer: session.customer, status: 'all', limit: 20 });
          for (const s of others.data) {
            if (s.id !== session.subscription && ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status)) {
              await getStripe().subscriptions.cancel(s.id);
              console.warn(`Cancelled duplicate subscription ${s.id} for customer ${session.customer}`);
            }
          }
        } catch (e) {
          console.error('Duplicate-subscription cleanup failed:', e.message);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const isActive = sub.status === 'active' || sub.status === 'trialing';
        const { data: prof } = await supabase.from('user_profiles')
          .select('id, subscription_id').eq('stripe_customer_id', sub.customer).single();
        if (!prof) { console.error('subscription.updated: no profile for customer', sub.customer); break; }
        if (isActive) {
          // Adopt this as the tracked sub. 'trialing' while in trial (capped
          // tighter), 'pro' once it's a paying subscription.
          const { error } = await supabase.from('user_profiles').update({
            subscription_status: sub.status === 'trialing' ? 'trialing' : 'pro',
            subscription_id: sub.id,
          }).eq('id', prof.id);
          if (error) console.error('Supabase update error (subscription.updated/active):', error.message);
        } else {
          // Non-active (canceled, unpaid, incomplete_expired…). Only downgrade if
          // this is the subscription we currently track — ignore stale/duplicate
          // subscriptions so cleaning one up can't revoke a valid Pro.
          if (prof.subscription_id && prof.subscription_id !== sub.id) {
            console.warn(`Ignoring non-active update for untracked sub ${sub.id} (customer ${sub.customer})`);
            break;
          }
          const { error } = await supabase.from('user_profiles').update({
            subscription_status: 'free',
          }).eq('id', prof.id);
          if (error) console.error('Supabase update error (subscription.updated/inactive):', error.message);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const { data: prof } = await supabase.from('user_profiles')
          .select('id, subscription_id').eq('stripe_customer_id', sub.customer).single();
        if (!prof) { console.error('subscription.deleted: no profile for customer', sub.customer); break; }
        // Only downgrade if the deleted subscription is the one we track. A
        // duplicate being cleaned up must NOT revoke Pro from the survivor.
        if (prof.subscription_id && prof.subscription_id !== sub.id) {
          console.warn(`Ignoring deletion of untracked sub ${sub.id} (customer ${sub.customer})`);
          break;
        }
        const { error } = await supabase.from('user_profiles').update({
          subscription_status: 'free',
          subscription_id: null,
        }).eq('id', prof.id);
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
