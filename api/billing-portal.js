import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const APP_URL = process.env.APP_URL ?? 'https://beattheexam.org';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Payments not configured' });

  const { customerId } = req.body ?? {};
  if (!customerId || typeof customerId !== 'string') {
    return res.status(400).json({ error: 'Missing customerId' });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${APP_URL}/account`,
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err.message);
    return res.status(500).json({ error: 'Failed to open billing portal' });
  }
}
