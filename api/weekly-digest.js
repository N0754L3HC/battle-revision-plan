import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? 'Battle Plan <onboarding@resend.dev>';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_KEY ?? ''
);

async function getAuthUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : user;
}

const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');

// Simple in-process rate limit: max 5 digest emails per IP per hour
const rl = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const entry = rl.get(ip) ?? { count: 0, reset: now + 3600000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 3600000; }
  if (entry.count >= 5) return false;
  entry.count++; rl.set(ip, entry); return true;
}

function fmtTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function gradeBg(g) {
  const map = { 'A*': '#fbbf24', A: '#4ade80', B: '#60a5fa', C: '#a78bfa', D: '#f97316', E: '#f87171', U: '#9b938b' };
  return map[g] || '#9b938b';
}

function buildHtml({ scores = [], subjects = [], rag = {} }) {
  const now = new Date();
  const weekAgo = new Date(now - 7 * 86400000);
  const weekScores = scores.filter(s => new Date(s.ts || s.id) >= weekAgo);
  const totalScores = scores.length;

  // Per-subject stats
  const subjectStats = subjects.map(s => {
    const all = scores.filter(sc => sc.subject === s.name);
    const week = weekScores.filter(sc => sc.subject === s.name);
    const avg = all.length ? Math.round(all.reduce((a, sc) => a + sc.pct, 0) / all.length) : null;
    const topics = Object.entries(rag).filter(([k]) => k.startsWith(s.id + '_'));
    const red = topics.filter(([, v]) => v === 'red').length;
    const amber = topics.filter(([, v]) => v === 'amber').length;
    const green = topics.filter(([, v]) => v === 'green').length;
    return { ...s, all, week, avg, red, amber, green };
  });

  const subjectRows = subjectStats.map(s => {
    const latestGrade = s.week.length ? s.week[s.week.length - 1].grade : null;
    // Validate color is a hex/rgb value before interpolating into HTML style
    const safeColor = /^#[0-9a-fA-F]{3,8}$/.test(s.color ?? '') ? s.color : '#888888';
    return `
      <div style="background:#ffffff;border:1px solid #e5e1db;border-radius:10px;padding:14px 18px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:10px;height:10px;border-radius:50%;background:${safeColor};flex-shrink:0;"></div>
            <span style="font-size:14px;font-weight:700;color:#18170f;">${esc(s.name)}</span>
            <span style="font-size:11px;color:#9b938b;">${esc(s.board)}</span>
          </div>
          ${latestGrade ? `<div style="font-size:22px;font-weight:900;color:${gradeBg(latestGrade)};">${latestGrade}</div>` : ''}
        </div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:${(s.red + s.amber + s.green) > 0 ? '10px' : '0'};">
          <div style="font-size:12px;color:#574f48;">
            <span style="font-weight:700;color:#18170f;">${s.all.length}</span> papers total
            ${s.week.length ? `&nbsp;&middot;&nbsp;<span style="font-weight:700;color:#b5735a;">${s.week.length} this week</span>` : ''}
          </div>
          ${s.avg !== null ? `<div style="font-size:12px;color:#574f48;"><span style="font-weight:700;color:#18170f;">${s.avg}%</span> avg</div>` : ''}
        </div>
        ${(s.red + s.amber + s.green) > 0 ? `
        <div style="display:flex;gap:8px;">
          ${s.red > 0 ? `<span style="font-size:11px;background:rgba(239,68,68,0.1);color:#ef4444;padding:2px 8px;border-radius:5px;font-weight:600;">${s.red} Red</span>` : ''}
          ${s.amber > 0 ? `<span style="font-size:11px;background:rgba(249,115,22,0.1);color:#f97316;padding:2px 8px;border-radius:5px;font-weight:600;">${s.amber} Amber</span>` : ''}
          ${s.green > 0 ? `<span style="font-size:11px;background:rgba(34,197,94,0.1);color:#22c55e;padding:2px 8px;border-radius:5px;font-weight:600;">${s.green} Green</span>` : ''}
        </div>` : ''}
      </div>`;
  }).join('');

  const weekStr = `${weekAgo.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0ece6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <div style="background:#0c0e13;border-radius:14px;padding:32px;margin-bottom:20px;">
      <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:20px;">
        <div style="width:32px;height:32px;border-radius:8px;background:#b5735a;display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;color:#fff;font-family:monospace;">A*</div>
        <span style="font-size:15px;font-weight:700;color:#e4dfd8;letter-spacing:0.2px;">Battle Plan</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#ffffff;line-height:1.2;">Weekly Progress Digest</h1>
      <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">${weekStr} &middot; ${weekScores.length} paper${weekScores.length !== 1 ? 's' : ''} logged this week</p>
    </div>

    ${weekScores.length === 0 ? `
    <div style="background:#ffffff;border:1px solid #e5e1db;border-radius:10px;padding:20px;margin-bottom:16px;text-align:center;">
      <div style="font-size:14px;color:#574f48;line-height:1.7;">No papers logged this week. Log your next past paper to keep your momentum going.</div>
    </div>` : ''}

    <div style="font-size:11px;font-weight:700;color:#b5735a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Subject summary</div>
    ${subjectRows}

    <div style="margin-top:24px;padding:16px 20px;background:rgba(181,115,90,0.08);border:1px solid rgba(181,115,90,0.2);border-radius:10px;text-align:center;">
      <p style="margin:0;font-size:13px;color:#574f48;line-height:1.6;">
        ${totalScores} paper${totalScores !== 1 ? 's' : ''} logged in total. Keep pushing — every paper counts.
        <br>Log on <a href="https://beattheexam.org" style="color:#b5735a;font-weight:600;">Battle Plan</a> to track your readiness.
      </p>
    </div>

    <div style="text-align:center;padding:24px 0 8px;font-size:11px;color:#9b938b;line-height:1.7;">
      Battle Plan &mdash; Free GCSE &amp; A-Level Revision Tracker<br>
      <a href="https://beattheexam.org" style="color:#b5735a;text-decoration:none;">beattheexam.org</a>
    </div>

  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: 'Email service not configured' });
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown';
  if (!rateLimit(ip)) return res.status(429).json({ error: 'Too many requests — try again later' });

  // Require authentication
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { email, scores = [], subjects = [], rag = {} } = req.body ?? {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  // Email must match the authenticated user
  if (email.toLowerCase() !== user.email?.toLowerCase()) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [email],
      subject: `Your Weekly Battle Plan Digest — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`,
      html: buildHtml({ scores, subjects, rag }),
    });

    if (error) {
      console.error('Resend error:', JSON.stringify(error));
      return res.status(500).json({ error: `Failed to send email (${error.statusCode ?? 'unknown'})` });
    }

    return res.status(200).json({ ok: true, id: data.id });
  } catch (err) {
    console.error('Digest error:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
}
