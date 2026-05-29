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

  // GET: return referral code + count + Pro reward window for the authenticated user
  if (req.method === 'GET') {
    const { data: profile } = await admin.from('user_profiles')
      .select('referral_code, referral_pro_until').eq('id', uid).single();

    const code = profile?.referral_code ?? null;
    const referral_pro_until = profile?.referral_pro_until ?? null;
    if (!code) return res.status(200).json({ code: null, count: 0, referral_pro_until });

    const { count } = await admin.from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_code', code);

    const refCount = count ?? 0;
    const nextMilestone = Math.ceil((refCount + 1) / 3) * 3;
    return res.status(200).json({ code, count: refCount, referral_pro_until, nextMilestone });
  }

  // POST: record a referral when a new user signs up with a ref code
  if (req.method === 'POST') {
    const { referrerCode } = req.body ?? {};
    if (!referrerCode || typeof referrerCode !== 'string')
      return res.status(400).json({ error: 'Missing referrerCode' });
    const code = referrerCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,8}$/.test(code))
      return res.status(400).json({ error: 'Invalid referral code format' });

    // Verify referrer code exists and is not the same user
    const { data: referrer } = await admin.from('user_profiles')
      .select('id').eq('referral_code', code).maybeSingle();
    if (!referrer) return res.status(404).json({ error: 'Invalid referral code' });
    if (referrer.id === uid) return res.status(400).json({ error: 'Cannot refer yourself' });

    const { error } = await admin.from('referrals').insert({
      referrer_code: code,
      referred_user_id: uid,
    });
    if (error) {
      if (error.code === '23505') return res.status(200).json({ ok: true }); // already recorded
      return res.status(500).json({ error: 'Failed to record referral' });
    }

    // Reward: every 3 *verified* referrals grants 7 days of Pro.
    // A referral is "verified" only when the referred user has logged at least 1 paper —
    // this prevents burner-account farming.
    const { data: allRefs } = await admin.from('referrals')
      .select('referred_user_id')
      .eq('referrer_code', code);
    const refUserIds = (allRefs ?? []).map(r => r.referred_user_id);
    let verifiedCount = 0;
    if (refUserIds.length) {
      const { data: act } = await admin.from('user_profiles')
        .select('id,papers_count')
        .in('id', refUserIds);
      verifiedCount = (act ?? []).filter(p => (p.papers_count ?? 0) > 0).length;
    }
    if (verifiedCount > 0 && verifiedCount % 3 === 0) {
      const { data: prof } = await admin.from('user_profiles')
        .select('referral_pro_until').eq('id', referrer.id).maybeSingle();
      const now = Date.now();
      const base = prof?.referral_pro_until ? Math.max(now, new Date(prof.referral_pro_until).getTime()) : now;
      const next = new Date(base + 7 * 86400000).toISOString();
      await admin.from('user_profiles')
        .update({ referral_pro_until: next })
        .eq('id', referrer.id);
      return res.status(200).json({ ok: true, milestone: true, referral_pro_until: next, refCount: allRefs?.length ?? 0, verifiedCount });
    }
    return res.status(200).json({ ok: true, refCount: allRefs?.length ?? 0, verifiedCount });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
