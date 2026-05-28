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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown';
  if (!rateLimit(ip)) return res.status(429).json({ error: 'Too many requests' });

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Aggregate opted-in users by school — minimum 3 users per school
  const { data, error } = await admin.rpc('school_leaderboard');
  if (error) {
    // Fallback: raw query if RPC doesn't exist yet
    const { data: rows, error: qErr } = await admin
      .from('user_profiles')
      .select('school_name, leaderboard_score')
      .eq('school_opt_in', true)
      .not('school_name', 'is', null);

    if (qErr) return res.status(500).json({ error: 'Query failed' });

    const grouped = {};
    for (const row of rows ?? []) {
      const name = row.school_name.trim();
      if (!name) continue;
      if (!grouped[name]) grouped[name] = { total: 0, count: 0 };
      grouped[name].total += row.leaderboard_score ?? 0;
      grouped[name].count++;
    }

    const schools = Object.entries(grouped)
      .filter(([, v]) => v.count >= 3)
      .map(([name, v]) => ({
        school_name: name,
        avg_score: Math.round(v.total / v.count),
        student_count: v.count,
      }))
      .sort((a, b) => b.avg_score - a.avg_score)
      .slice(0, 20);

    return res.status(200).json({ schools });
  }

  return res.status(200).json({ schools: data ?? [] });
}
