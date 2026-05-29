import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_KEY ?? ''
);

const ipBucket = new Map();
const userBucket = new Map();
function take(map, key, cap) {
  const now = Date.now();
  const entry = map.get(key) ?? { count: 0, reset: now + 3600000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 3600000; }
  if (entry.count >= cap) return false;
  entry.count++; map.set(key, entry); return true;
}
const rateLimitIp   = ip  => take(ipBucket,   ip,  30);
const rateLimitUser = uid => take(userBucket, uid, 60);

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
  if (!rateLimitIp(ip)) return res.status(429).json({ error: 'Too many requests' });

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!rateLimitUser(user.id)) return res.status(429).json({ error: 'Too many requests for this account' });

  const yearFilter = typeof req.query?.year === 'string' && /^Y(10|11|12|13)$/.test(req.query.year)
    ? req.query.year : null;

  let q = admin
    .from('user_profiles')
    .select('school_name, year_group, leaderboard_score, leaderboard_snapshot_week')
    .eq('school_opt_in', true)
    .not('school_name', 'is', null);
  if (yearFilter) q = q.eq('year_group', yearFilter);

  const { data: rows, error: qErr } = await q;
  if (qErr) return res.status(500).json({ error: 'Query failed' });

  const grouped = {};
  let allTotal = 0, allCount = 0;
  for (const row of rows ?? []) {
    const name = row.school_name.trim();
    if (!name) continue;
    if (!grouped[name]) grouped[name] = { total: 0, count: 0, lastWeekTotal: 0, lastWeekCount: 0 };
    grouped[name].total += row.leaderboard_score ?? 0;
    grouped[name].count++;
    allTotal += row.leaderboard_score ?? 0;
    allCount++;
    const lw = row.leaderboard_snapshot_week?.score;
    if (typeof lw === 'number') {
      grouped[name].lastWeekTotal += lw;
      grouped[name].lastWeekCount++;
    }
  }

  const nationalAvg = allCount ? Math.round(allTotal / allCount) : null;

  const schools = Object.entries(grouped)
    .filter(([, v]) => v.count >= 3)
    .map(([name, v]) => {
      const avg = Math.round(v.total / v.count);
      const lastWeekAvg = v.lastWeekCount >= 3 ? Math.round(v.lastWeekTotal / v.lastWeekCount) : null;
      const weeklyDiff = lastWeekAvg != null ? avg - lastWeekAvg : null;
      return {
        school_name: name,
        avg_score: avg,
        student_count: v.count,
        weekly_diff: weeklyDiff,
      };
    })
    .sort((a, b) => b.avg_score - a.avg_score)
    .slice(0, 20);

  return res.status(200).json({ schools, national_avg: nationalAvg, year_filter: yearFilter });
}
