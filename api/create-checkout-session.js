import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;
const APP_URL = process.env.APP_URL ?? 'https://beattheexam.org';

const rl = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const entry = rl.get(ip) ?? { count: 0, reset: now + 3600000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 3600000; }
  if (entry.count >= 5) return false;
  entry.count++; rl.set(ip, entry); return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.STRIPE_SECRET_KEY || !PRO_PRICE_ID) {
    return res.status(503).json({ error: 'Payments not configured' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown';
  if (!rateLimit(ip)) return res.status(429).json({ error: 'Too many requests' });

  const { userId, email, customerId } = req.body ?? {};
  if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'Missing userId' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });

  try {
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
