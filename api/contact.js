import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? 'Battle Plan <onboarding@resend.dev>';
// Enquiries land in BOTH inboxes. The personal address lives only here (server
// side) and in env — it is never sent to the client, so students never see it.
const TO = (process.env.CONTACT_TO ?? 'contact.battleplan.team@gmail.com,charismuzee@gmail.com')
  .split(',').map(s => s.trim()).filter(Boolean);

const supabaseAdmin = createClient(process.env.SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_KEY ?? '');

async function getAuthUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : user;
}

const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');

// Light anti-spam: 5 enquiries per user / hour.
const rl = new Map();
function rateLimit(key) {
  const now = Date.now();
  const e = rl.get(key) ?? { count: 0, reset: now + 3600000 };
  if (now > e.reset) { e.count = 0; e.reset = now + 3600000; }
  if (e.count >= 5) return false;
  e.count++; rl.set(key, e); return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: 'Messaging is not switched on yet.' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'Server not configured' });

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in to contact us.' });
  if (!rateLimit(user.id)) return res.status(429).json({ error: 'You\'ve sent a few messages already — please give us a little time to reply.' });

  const { contact, message } = req.body ?? {};
  const msg = String(message ?? '').trim();
  const reach = String(contact ?? '').trim().slice(0, 200);
  if (msg.length < 5) return res.status(400).json({ error: 'Please add a bit more detail to your message.' });
  if (msg.length > 4000) return res.status(400).json({ error: 'That message is a bit long — please keep it under 4000 characters.' });

  // If they gave an email, set it as reply-to so the team can reply directly.
  const replyEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reach) ? reach : null;

  const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f0ece6;padding:24px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e1db;border-radius:12px;padding:24px;">
      <div style="font-size:12px;font-weight:700;color:#b5735a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:14px;">New Battle Plan enquiry</div>
      <table style="font-size:14px;color:#18170f;line-height:1.7;border-collapse:collapse;">
        <tr><td style="color:#9b938b;padding-right:12px;vertical-align:top;">From</td><td>${esc(user.email || 'unknown')}</td></tr>
        <tr><td style="color:#9b938b;padding-right:12px;vertical-align:top;">Reach&nbsp;at</td><td>${reach ? esc(reach) : '<i>not provided</i>'}</td></tr>
        <tr><td style="color:#9b938b;padding-right:12px;vertical-align:top;">User&nbsp;ID</td><td style="color:#9b938b;">${esc(user.id)}</td></tr>
      </table>
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid #eee;font-size:14px;color:#18170f;line-height:1.7;white-space:pre-wrap;">${esc(msg)}</div>
    </div></body></html>`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: replyEmail || undefined,
      subject: `Battle Plan enquiry from ${user.email || reach || 'a student'}`,
      html,
    });
    if (error) {
      console.error('Contact resend error:', JSON.stringify(error));
      return res.status(500).json({ error: 'Couldn\'t send your message right now — please email us directly instead.' });
    }
    return res.status(200).json({ ok: true, id: data?.id });
  } catch (err) {
    console.error('Contact error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
