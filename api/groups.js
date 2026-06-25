import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_KEY ?? ''
);

// Per-IP and per-user limits (in-process; survives ~serverless lifetime).
// Sliding-window-ish: refill every hour.
const ipBucket = new Map();
const userBucket = new Map();
function takeBucket(map, key, cap) {
  const now = Date.now();
  const entry = map.get(key) ?? { count: 0, reset: now + 3600000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 3600000; }
  if (entry.count >= cap) return false;
  entry.count++; map.set(key, entry); return true;
}
const rateLimitIp   = ip  => takeBucket(ipBucket,   ip,  40);
// Per-user: tighter limits to stop authenticated bot fan-out
const rateLimitUser = uid => takeBucket(userBucket, uid, 60); // total /api/groups calls per user per hour
// Specific per-user limits per action — narrower than the overall user budget
function rateLimitAction(uid, action) {
  const cap = action === 'create' ? 5 : action === 'join' ? 12 : 20;
  return takeBucket(userBucket, `${uid}:${action}`, cap);
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

// Quick client-facing profanity check (mirrors the DB trigger contains_banned_word,
// which is the real guard). Lets us return a friendly message before the insert.
const BANNED_SUB = /(nigger|nigga|niglet|faggot|wetback|beaner|golliwog|towelhead|raghead|bitch|fuck|shit|wank|twat|slut|whore|bollock|arsehole|asshole|pussy|jizz|dildo|paedo|molest)/;
const BANNED_WB  = /\b(coons?|chinks?|gooks?|kikes?|spics?|pakis?|wogs?|fags?|dykes?|trann(y|ies)|cunts?|fuk|pricks?|slags?|bastards?|piss|rape|rapists?|pedos?|nonces?|incest|porn|cum|anal|penis|hitler|nazis?|kkk)\b/;
function nameLooksOffensive(txt) {
  if (!txt) return false;
  const s = String(txt).toLowerCase().replace(/[0134578@$!]/g, c => ({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','8':'b','@':'a','$':'s','!':'i'}[c] || c));
  return BANNED_SUB.test(s) || BANNED_WB.test(s);
}

export default async function handler(req, res) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(503).json({ error: 'Server not configured', missing: { SUPABASE_URL: !process.env.SUPABASE_URL, SUPABASE_SERVICE_KEY: !process.env.SUPABASE_SERVICE_KEY } });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown';
  if (!rateLimitIp(ip)) return res.status(429).json({ error: 'Too many requests' });

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const uid = user.id;
  if (!rateLimitUser(uid)) return res.status(429).json({ error: 'Too many requests for this account' });
  if (req.method === 'POST') {
    const action = req.body?.action;
    if (action && !rateLimitAction(uid, action)) {
      return res.status(429).json({ error: `Slow down — too many "${action}" requests` });
    }
  }

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
    if (nameLooksOffensive(name)) return res.status(400).json({ error: 'Please choose a different group name.' });

    // Check how many groups this user already owns. Free: 3; Pro/admin: 10.
    const { count } = await admin.from('study_groups')
      .select('id', { count: 'exact', head: true }).eq('created_by', uid);
    const { data: prof } = await admin.from('user_profiles')
      .select('subscription_status,referral_pro_until,is_admin').eq('id', uid).single();
    const isPro = prof?.is_admin
      || ['pro','trialing','active'].includes(prof?.subscription_status)
      || (prof?.referral_pro_until && new Date(prof.referral_pro_until).getTime() > Date.now());
    const cap = isPro ? 10 : 3;
    if (count >= cap) return res.status(400).json({
      error: isPro ? `Max ${cap} groups per user` : `Free accounts can create up to 3 groups. Upgrade to Pro for more.`
    });

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
    if (error) {
      if (error.code === '23514' || /banned_name/.test(error.message || '')) {
        return res.status(400).json({ error: 'Please choose a different group name.' });
      }
      return res.status(500).json({ error: 'Failed to create group' });
    }

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

  // ── report ──────────────────────────────────────────────────────────────
  if (action === 'report') {
    const { target_type, target_id, target_label, reason, note } = req.body ?? {};
    const TYPES = ['group', 'member', 'name', 'other'];
    const REASONS = ['offensive_name', 'harassment', 'inappropriate', 'spam', 'other'];
    if (!TYPES.includes(target_type)) return res.status(400).json({ error: 'Invalid report target' });
    if (!REASONS.includes(reason)) return res.status(400).json({ error: 'Please choose a reason' });
    const { error } = await admin.from('reports').insert({
      reporter_id: uid,
      target_type,
      target_id: target_id ? String(target_id).slice(0, 80) : null,
      target_label: target_label ? String(target_label).slice(0, 120) : null,
      reason,
      note: note ? String(note).slice(0, 300) : null,
    });
    if (error) return res.status(500).json({ error: 'Failed to submit report' });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
