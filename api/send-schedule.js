import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? 'A* Battle Plan <onboarding@resend.dev>';

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

// Escape HTML entities to prevent injection in email body
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');

// Max 10 schedule emails per IP per hour
const rl = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const entry = rl.get(ip) ?? { count: 0, reset: now + 3600000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 3600000; }
  if (entry.count >= 10) return false;
  entry.count++; rl.set(ip, entry); return true;
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return null;
  return `${diff} days`;
}

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

function buildHtml(exams) {
  const rows = exams.map(e => {
    const countdown = daysUntil(e.date);
    const urgentColor = countdown === 'Today' ? '#ef4444' : countdown === 'Tomorrow' ? '#f97316' : '#b5735a';
    return `
      <div style="background:#ffffff;border:1px solid #e5e1db;border-radius:10px;padding:16px 20px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="flex:1;">
            <div style="font-size:11px;font-weight:700;color:#b5735a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">${esc(e.board)} &middot; ${esc(e.time)} &middot; ${esc(e.duration)}</div>
            <div style="font-size:15px;font-weight:700;color:#18170f;margin-bottom:3px;">${esc(e.subject)}</div>
            <div style="font-size:13px;color:#574f48;margin-bottom:3px;">${esc(e.paper)}</div>
            <div style="font-size:11px;color:#9b938b;">${esc(e.code)} &middot; ${fmtDate(e.date)}</div>
          </div>
          ${countdown ? `<div style="flex-shrink:0;margin-left:16px;text-align:center;background:${urgentColor}18;border:1px solid ${urgentColor}44;border-radius:8px;padding:8px 12px;">
            <div style="font-size:18px;font-weight:800;color:${urgentColor};line-height:1;">${countdown === 'Today' || countdown === 'Tomorrow' ? countdown : countdown.replace(' days', '')}</div>
            ${countdown !== 'Today' && countdown !== 'Tomorrow' ? `<div style="font-size:10px;color:${urgentColor}99;font-weight:600;letter-spacing:0.5px;">DAYS</div>` : ''}
          </div>` : ''}
        </div>
      </div>
    `;
  }).join('');

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
      <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#ffffff;line-height:1.2;">Your exam schedule</h1>
      <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">${exams.length} paper${exams.length !== 1 ? 's' : ''} remaining. Keep going — you've got this.</p>
    </div>

    ${rows}

    <div style="margin-top:24px;padding:16px 20px;background:rgba(181,115,90,0.08);border:1px solid rgba(181,115,90,0.2);border-radius:10px;text-align:center;">
      <p style="margin:0;font-size:13px;color:#574f48;line-height:1.6;">
        Log every paper you do on <a href="https://beattheexam.org" style="color:#b5735a;font-weight:600;">A* Battle Plan</a> to track your readiness score and spot weak topics before exam day.
      </p>
    </div>

    <div style="text-align:center;padding:24px 0 8px;font-size:11px;color:#9b938b;line-height:1.7;">
      A* Battle Plan &mdash; Free A-Level Revision Tracker<br>
      <a href="https://beattheexam.org" style="color:#b5735a;text-decoration:none;">beattheexam.org</a>
    </div>

  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.RESEND_API_KEY) {
    return res.status(503).json({ error: 'Email service not configured' });
  }
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown';
  if (!rateLimit(ip)) return res.status(429).json({ error: 'Too many requests — try again later' });

  // Require authentication — prevents abuse of email-sending endpoint
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { email, exams } = req.body ?? {};

  // Email must match the authenticated user's address
  if (email && email.toLowerCase() !== user.email?.toLowerCase()) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Validate email
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  // Validate exams
  if (!Array.isArray(exams) || exams.length === 0) {
    return res.status(400).json({ error: 'No exams provided' });
  }

  // Filter to today onwards and cap payload size
  const today = new Date().toISOString().split('T')[0];
  const upcoming = exams
    .filter(e => e?.date >= today && typeof e.date === 'string' && typeof e.paper === 'string')
    .slice(0, 60);

  if (upcoming.length === 0) {
    return res.status(400).json({ error: 'No upcoming exams found' });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [email],
      subject: `Your A-Level Exam Schedule — ${upcoming.length} paper${upcoming.length !== 1 ? 's' : ''} remaining`,
      html: buildHtml(upcoming),
    });

    if (error) {
      console.error('Resend error:', JSON.stringify(error));
      const msg = error.statusCode === 403
        ? 'Sender not verified — verify beattheexam.org in Resend dashboard and set RESEND_FROM in Vercel env vars'
        : `Failed to send email (${error.statusCode ?? 'unknown'})`;
      return res.status(500).json({ error: msg });
    }

    return res.status(200).json({ ok: true, id: data.id });
  } catch (err) {
    console.error('Send error:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
}
