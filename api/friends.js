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
  if (entry.count >= 30) return false;
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

  // ── GET: list friends, pending requests, sent requests ──────────────────
  if (req.method === 'GET') {
    const { data: rows = [] } = await admin.from('friend_requests')
      .select('*')
      .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`)
      .neq('status', 'declined');

    const pending = rows.filter(r => r.to_user_id === uid && r.status === 'pending');
    const sent    = rows.filter(r => r.from_user_id === uid && r.status === 'pending');
    const accepted = rows.filter(r => r.status === 'accepted');

    const friendIds = [...new Set(accepted.map(r =>
      r.from_user_id === uid ? r.to_user_id : r.from_user_id
    ))];

    let friends = [];
    if (friendIds.length > 0) {
      const { data: profiles = [] } = await admin.from('user_profiles')
        .select('id,display_name,leaderboard_score,papers_count,email')
        .in('id', friendIds);
      friends = profiles.map(p => ({
        user_id: p.id,
        display_name: p.display_name || p.email?.split('@')[0] || 'Friend',
        leaderboard_score: Math.round(p.leaderboard_score ?? 0),
        papers_count: p.papers_count ?? 0,
      }));
    }

    return res.status(200).json({ friends, pending, sent });
  }

  // ── POST: friend actions ─────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { action } = req.body ?? {};

    if (action === 'send') {
      const rawEmail = req.body?.email;
      if (!rawEmail || typeof rawEmail !== 'string') return res.status(400).json({ error: 'Invalid email' });
      const email = rawEmail.toLowerCase().trim();
      if (email === user.email?.toLowerCase()) return res.status(400).json({ error: "Can't add yourself" });

      // Resolve target by email
      const { data: target } = await admin.from('user_profiles')
        .select('id,email').eq('email', email).maybeSingle();
      if (!target) return res.status(404).json({ error: 'No Battle Plan account found with that email' });

      // Check existing connection
      const { data: existing } = await admin.from('friend_requests')
        .select('id,status')
        .or(`and(from_user_id.eq.${uid},to_user_id.eq.${target.id}),and(from_user_id.eq.${target.id},to_user_id.eq.${uid})`)
        .maybeSingle();

      if (existing?.status === 'accepted') return res.status(400).json({ error: 'Already friends' });
      if (existing?.status === 'pending')  return res.status(400).json({ error: 'Request already pending' });

      const { error } = await admin.from('friend_requests').insert({
        from_user_id: uid, to_user_id: target.id,
        from_email: user.email, to_email: email, status: 'pending',
      });
      if (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Request already sent' });
        console.error('friend send error:', error.message);
        return res.status(500).json({ error: 'Failed to send request' });
      }
      return res.status(200).json({ ok: true });
    }

    if (action === 'accept') {
      const { requestId } = req.body;
      if (!requestId) return res.status(400).json({ error: 'Missing requestId' });
      const { error } = await admin.from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId).eq('to_user_id', uid);
      if (error) return res.status(500).json({ error: 'Failed to accept' });
      return res.status(200).json({ ok: true });
    }

    if (action === 'decline') {
      const { requestId } = req.body;
      if (!requestId) return res.status(400).json({ error: 'Missing requestId' });
      const { error } = await admin.from('friend_requests')
        .update({ status: 'declined' })
        .eq('id', requestId).eq('to_user_id', uid);
      if (error) return res.status(500).json({ error: 'Failed to decline' });
      return res.status(200).json({ ok: true });
    }

    if (action === 'remove') {
      const { friendUserId } = req.body;
      if (!friendUserId) return res.status(400).json({ error: 'Missing friendUserId' });
      await admin.from('friend_requests')
        .delete()
        .or(`and(from_user_id.eq.${uid},to_user_id.eq.${friendUserId}),and(from_user_id.eq.${friendUserId},to_user_id.eq.${uid})`);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
