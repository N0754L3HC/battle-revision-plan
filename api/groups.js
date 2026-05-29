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
  if (entry.count >= 40) return false;
  entry.count++; rl.set(ip, entry); return true;
}

async function getAuthUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  return error ? null : user;
}

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default async function handler(req, res) {
  if (!process.env.SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'Not configured' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown';
  if (!rateLimit(ip)) return res.status(429).json({ error: 'Too many requests' });

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const uid = user.id;

  // ── GET: list groups the user belongs to, with member leaderboards ─────────
  if (req.method === 'GET') {
    const { data: memberships = [] } = await admin.from('group_members')
      .select('group_id').eq('user_id', uid);

    const groupIds = memberships.map(m => m.group_id);
    if (!groupIds.length) return res.status(200).json({ groups: [] });

    const { data: groups = [] } = await admin.from('study_groups')
      .select('*').in('id', groupIds);

    const { data: allMembers = [] } = await admin.from('group_members')
      .select('group_id,user_id').in('group_id', groupIds);

    const allMemberIds = [...new Set(allMembers.map(m => m.user_id))];
    let profiles = [];
    if (allMemberIds.length) {
      // Only select non-PII fields. Never expose member emails to other members.
      const { data: p = [] } = await admin.from('user_profiles')
        .select('id,display_name,leaderboard_score,papers_count')
        .in('id', allMemberIds);
      profiles = p;
    }

    const enriched = groups.map(g => {
      const memberIds = allMembers.filter(m => m.group_id === g.id).map(m => m.user_id);
      const members = memberIds.map(mid => {
        const p = profiles.find(p => p.id === mid) ?? {};
        return {
          user_id: mid,
          display_name: p.display_name || 'Member',
          leaderboard_score: Math.round(p.leaderboard_score ?? 0),
          papers_count: p.papers_count ?? 0,
          is_me: mid === uid,
        };
      }).sort((a, b) => b.leaderboard_score - a.leaderboard_score);
      return { ...g, members };
    });

    return res.status(200).json({ groups: enriched });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action } = req.body ?? {};

  // ── create ────────────────────────────────────────────────────────────────
  if (action === 'create') {
    const name = req.body?.name?.trim();
    if (!name || name.length < 2 || name.length > 40) return res.status(400).json({ error: 'Name must be 2–40 chars' });

    // Check how many groups this user already owns
    const { count } = await admin.from('study_groups')
      .select('id', { count: 'exact', head: true }).eq('created_by', uid);
    if (count >= 5) return res.status(400).json({ error: 'Max 5 groups per user' });

    let invite_code = randomCode();
    // Ensure uniqueness
    for (let i = 0; i < 5; i++) {
      const { data: clash } = await admin.from('study_groups').select('id').eq('invite_code', invite_code).maybeSingle();
      if (!clash) break;
      invite_code = randomCode();
    }

    const { data: group, error } = await admin.from('study_groups')
      .insert({ name, created_by: uid, invite_code })
      .select().single();
    if (error) return res.status(500).json({ error: 'Failed to create group' });

    await admin.from('group_members').insert({ group_id: group.id, user_id: uid });
    return res.status(200).json({ group });
  }

  // ── join ──────────────────────────────────────────────────────────────────
  if (action === 'join') {
    const raw = req.body?.invite_code;
    if (!raw || typeof raw !== 'string') return res.status(400).json({ error: 'Missing invite code' });
    const code = raw.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,8}$/.test(code)) return res.status(400).json({ error: 'Invalid invite code format' });

    const { data: group } = await admin.from('study_groups')
      .select('*').eq('invite_code', code).maybeSingle();
    if (!group) return res.status(404).json({ error: 'No group found with that code' });

    const { count: memberCount } = await admin.from('group_members')
      .select('user_id', { count: 'exact', head: true }).eq('group_id', group.id);
    if (memberCount >= 30) return res.status(400).json({ error: 'Group is full (max 30 members)' });

    const { error } = await admin.from('group_members')
      .insert({ group_id: group.id, user_id: uid });
    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'Already in this group' });
      return res.status(500).json({ error: 'Failed to join group' });
    }
    return res.status(200).json({ group });
  }

  // ── leave ─────────────────────────────────────────────────────────────────
  if (action === 'leave') {
    const { group_id } = req.body;
    if (!group_id) return res.status(400).json({ error: 'Missing group_id' });
    await admin.from('group_members').delete().eq('group_id', group_id).eq('user_id', uid);
    // Delete group if empty
    const { count } = await admin.from('group_members')
      .select('user_id', { count: 'exact', head: true }).eq('group_id', group_id);
    if (count === 0) await admin.from('study_groups').delete().eq('id', group_id);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
