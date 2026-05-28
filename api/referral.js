import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_KEY ?? ''
);

const rl = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const entry = rl.get(ip) ?? { count: 0, reset: now + 3600000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 3600000; }
  if (entry.count >= 20) return false;
  entry.count++; rl.set(ip, entry); return true;
}

async function getAuthUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  return error ? null : user;
}

export default async function handler(req, res) {
  if (!process.env.SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'Not configured' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown';
  if (!rateLimit(ip)) return res.status(429).json({ error: 'Too many requests' });

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const uid = user.id;

  // GET: return referral code + count for the authenticated user
  if (req.method === 'GET') {
    const { data: profile } = await admin.from('user_profiles')
      .select('referral_code').eq('id', uid).single();

    const code = profile?.referral_code ?? null;
    if (!code) return res.status(200).json({ code: null, count: 0 });

    const { count } = await admin.from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_code', code);

    return res.status(200).json({ code, count: count ?? 0 });
  }

  // POST: record a referral when a new user signs up with a ref code
  if (req.method === 'POST') {
    const { referrerCode } = req.body ?? {};
    if (!referrerCode || typeof referrerCode !== 'string')
      return res.status(400).json({ error: 'Missing referrerCode' });

    // Verify referrer code exists and is not the same user
    const { data: referrer } = await admin.from('user_profiles')
      .select('id').eq('referral_code', referrerCode).maybeSingle();
    if (!referrer) return res.status(404).json({ error: 'Invalid referral code' });
    if (referrer.id === uid) return res.status(400).json({ error: 'Cannot refer yourself' });

    const { error } = await admin.from('referrals').insert({
      referrer_code: referrerCode,
      referred_user_id: uid,
    });
    if (error) {
      if (error.code === '23505') return res.status(200).json({ ok: true }); // already recorded
      return res.status(500).json({ error: 'Failed to record referral' });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
