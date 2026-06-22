import { createClient } from '@supabase/supabase-js';

let _admin = null;
function getAdmin() {
  if (_admin) return _admin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  _admin = createClient(url, key);
  return _admin;
}

async function getAuthUser(req, admin) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  return error ? null : user;
}

const ipBucket = new Map(), userBucket = new Map();
function take(map, key, cap, windowMs) {
  const now = Date.now();
  const e = map.get(key) ?? { count: 0, reset: now + windowMs };
  if (now > e.reset) { e.count = 0; e.reset = now + windowMs; }
  if (e.count >= cap) return false;
  e.count++; map.set(key, e); return true;
}
const HOUR = 3600000;

const SYSTEM = `You are Caps, a UK GCSE/A-Level revision coach building a student's week.
Given their subjects, RAG-rated topics (red = weak, amber = shaky, green = solid), recent averages, target grades and upcoming exams, produce a concrete 7-day revision plan.

RULES
- Weight time toward RED topics first, then AMBER, then nearest exams and biggest gap-to-target. Don't schedule green topics unless there's spare time.
- Spread realistically across the 7 days within the student's stated weekly hours. Mix subjects per day; avoid one subject all day. Keep individual sessions 30–60 min.
- Every task must use one of the student's ACTUAL subjects and a specific topic from the data. Never invent subjects or topics.
- Prefer active recall + past-paper practice phrasing over "read notes".

OUTPUT — return ONLY a JSON object, no prose around it:
{
  "summary": "<2-3 sentence plain-English overview of the week's focus>",
  "tasks": [
    {"subject":"<exact subject name>","topic":"<specific topic>","day":"today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday","duration_min":<int 30-60>}
  ]
}
Keep it to a sensible number of tasks for the weekly hours (roughly hours*60/45). Be specific and realistic.`;

async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL_PLAN || 'claude-haiku-4-5';
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 1500, temperature: 0.4, system: SYSTEM,
      messages: [{ role: 'user', content: prompt }] }),
  });
  if (!r.ok) { const t = await r.text(); const e = new Error(`Claude ${r.status}: ${t.slice(0, 200)}`); e.status = r.status; throw e; }
  const d = await r.json();
  return (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

function parseJson(text) {
  if (!text) return null;
  const raw = text.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
  if (a === -1 || b === -1) return null;
  try { return JSON.parse(raw.slice(a, b + 1)); } catch { return null; }
}

const DAYS = ['today','tomorrow','monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const admin = getAdmin();
  if (!admin) return res.status(503).json({ error: 'Server not configured' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'AI planning is not switched on yet — set ANTHROPIC_API_KEY in env.' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown';
  if (!take(ipBucket, ip, 20, HOUR)) return res.status(429).json({ error: 'Too many requests' });

  const user = await getAuthUser(req, admin);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: prof } = await admin.from('user_profiles')
    .select('subscription_status,referral_pro_until,is_admin').eq('id', user.id).single();
  const isPro = prof?.is_admin
    || ['pro', 'trialing', 'active'].includes(prof?.subscription_status)
    || (prof?.referral_pro_until && new Date(prof.referral_pro_until).getTime() > Date.now());
  if (!isPro) return res.status(402).json({ error: 'AI study plans are a Pro feature' });
  if (!prof?.is_admin && !take(userBucket, user.id, 10, HOUR)) return res.status(429).json({ error: 'Plan limit reached (10/hour). Try again later.' });

  const { context, hoursPerWeek } = req.body ?? {};
  if (!context || typeof context !== 'object') return res.status(400).json({ error: 'Missing context' });

  const hrs = Math.max(2, Math.min(40, parseInt(hoursPerWeek, 10) || 10));
  const brief = JSON.stringify(context).slice(0, 12000);
  const prompt = `The student wants about ${hrs} hours of revision this week.\nHere is their study system (subjects, RAG topics, averages, targets, upcoming exams):\n${brief}`;

  try {
    const text = await callClaude(prompt);
    const out = parseJson(text);
    if (!out || !Array.isArray(out.tasks)) return res.status(502).json({ error: 'Could not build a plan — try again.' });

    const actions = out.tasks.slice(0, 30).map(t => {
      if (!t || typeof t.subject !== 'string') return null;
      const day = DAYS.includes(String(t.day || '').toLowerCase()) ? String(t.day).toLowerCase() : 'today';
      const dur = Number(t.duration_min);
      return { type: 'add_plan_task', subject: t.subject.slice(0, 60), topic: String(t.topic || '').slice(0, 120),
        day, duration_min: Number.isFinite(dur) ? Math.max(15, Math.min(120, Math.round(dur))) : 45 };
    }).filter(Boolean);

    if (!actions.length) return res.status(502).json({ error: 'No tasks produced — try again.' });
    return res.status(200).json({ summary: String(out.summary || '').slice(0, 600), actions });
  } catch (err) {
    console.error('Study-plan error:', err.status, err.message);
    if (err.status === 429) return res.status(200).json({ error: 'The planner is busy — try again in a minute.' });
    return res.status(500).json({ error: 'Planning failed — try again.' });
  }
}
