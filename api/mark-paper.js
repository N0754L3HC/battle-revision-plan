import { createClient } from '@supabase/supabase-js';

// Lazy init so missing env vars surface as a clean 503, not a module-load crash.
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

// Marking is expensive — keep it tight. Hourly + daily per user.
const ipBucket = new Map();
const userBucket = new Map();
const userDay = new Map();
function take(map, key, cap, windowMs) {
  const now = Date.now();
  const e = map.get(key) ?? { count: 0, reset: now + windowMs };
  if (now > e.reset) { e.count = 0; e.reset = now + windowMs; }
  if (e.count >= cap) return false;
  e.count++; map.set(key, e); return true;
}
const HOUR = 3600000, DAY = 86400000;
const MARK_HOUR_IP   = parseInt(process.env.MARK_HOUR_PER_IP   || '15', 10);
const MARK_HOUR_USER = parseInt(process.env.MARK_HOUR_PER_USER || '6',  10);
const MARK_DAY_USER  = parseInt(process.env.MARK_DAY_PER_USER  || '20', 10);

// Limits on the payload Claude sees (cost + abuse control).
const MAX_IMAGES = 12;
const MAX_TEXT   = 16000;       // chars of typed answers / mark scheme
const MAX_IMG_B64 = 5_000_000;  // ~3.7MB decoded per image
const MAX_DOC_B64 = 14_000_000; // ~10MB decoded per PDF

const MARK_SYSTEM = `You are an experienced UK GCSE/A-Level examiner marking a student's OWN attempt at a past paper, for revision feedback. You are NOT producing an official result.

RULES
- Mark in the style and standards of the stated exam board, but make clear every figure is an ESTIMATE for revision, never an official mark or grade.
- If the student supplied a mark scheme, align to it. If not, use your subject expertise. Never invent or claim to quote an official mark scheme you weren't given.
- Be specific and kind. For each question: the estimated marks earned/available, what was right, what lost marks, and the precise fix.
- Identify recurring error types (e.g. "unit errors", "didn't show working", "misread command word", a specific weak topic).
- Do NOT do the student's coursework/NEA. This is past-paper feedback only.

OUTPUT — return ONLY a single JSON object, no prose around it:
{
  "estimatedPercent": <int 0-100>,
  "estimatedGrade": "<board-appropriate grade or null>",
  "confidence": "low|medium|high",
  "summary": "<2-3 sentence overall feedback>",
  "questions": [{"q":"<label>","earned":<int>,"available":<int>,"feedback":"<one line>"}],
  "errors": [{"topic":"<short topic>","type":"<error type>","note":"<one line>"}],
  "suggestedTopicsToRevise": ["<short topic>", ...]
}
Keep it compact. If you cannot read the work, set confidence "low" and say so in summary.`;

function clampText(s) { return String(s ?? '').slice(0, MAX_TEXT); }

// Parse a data URL or raw base64 into Anthropic image block. Returns null if invalid/oversized.
function toImageBlock(input) {
  if (typeof input !== 'string') return null;
  let media = 'image/jpeg', b64 = input;
  const m = input.match(/^data:(image\/(png|jpe?g|webp|gif));base64,(.+)$/);
  if (m) { media = m[1]; b64 = m[3]; }
  if (!b64 || b64.length > MAX_IMG_B64) return null;
  return { type: 'image', source: { type: 'base64', media_type: media, data: b64 } };
}

// Turn a data URL into an Anthropic content block — image OR PDF (document).
function toAttachmentBlock(input) {
  if (typeof input !== 'string') return null;
  const pdf = input.match(/^data:application\/pdf;base64,(.+)$/);
  if (pdf) {
    if (pdf[1].length > MAX_DOC_B64) return null;
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf[1] } };
  }
  return toImageBlock(input);
}

async function callClaudeMark({ userBlocks }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL_MARK || 'claude-sonnet-4-6';
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model, max_tokens: 2000, temperature: 0.2,
      system: MARK_SYSTEM,
      messages: [{ role: 'user', content: userBlocks }],
    }),
  });
  if (!r.ok) {
    const txt = await r.text();
    const err = new Error(`Claude ${r.status}: ${txt.slice(0, 200)}`);
    err.status = r.status;
    throw err;
  }
  const d = await r.json();
  const text = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  return text;
}

// Pull the first JSON object out of the model's reply, defensively.
function parseResult(text) {
  if (!text) return null;
  let raw = text.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const start = raw.indexOf('{'), end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = getAdmin();
  if (!admin) return res.status(503).json({ error: 'Server not configured — SUPABASE_URL or SUPABASE_SERVICE_KEY missing' });
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'Paper marking is not switched on yet — set ANTHROPIC_API_KEY in env.' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown';
  if (!take(ipBucket, ip, MARK_HOUR_IP, HOUR)) return res.status(429).json({ error: 'Too many requests' });

  const user = await getAuthUser(req, admin);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const uid = user.id;

  // Pro gate — same 3 signals as the rest of the app. Non-Pro users get ONE
  // free mark per rolling 7 days (last_free_mark_at), so everyone can taste it.
  const { data: prof } = await admin.from('user_profiles')
    .select('subscription_status,referral_pro_until,is_admin,last_free_mark_at').eq('id', uid).single();
  const isPro = prof?.is_admin
    || ['pro', 'trialing', 'active'].includes(prof?.subscription_status)
    || (prof?.referral_pro_until && new Date(prof.referral_pro_until).getTime() > Date.now());

  let usingFreeMark = false;
  if (!isPro) {
    const last = prof?.last_free_mark_at ? new Date(prof.last_free_mark_at).getTime() : 0;
    if (Date.now() - last < 7 * DAY) {
      const days = Math.ceil((7 * DAY - (Date.now() - last)) / DAY);
      return res.status(402).json({ error: `You've used your free AI mark this week. Upgrade to Pro for unlimited marking, or come back in ${days} day${days===1?'':'s'}.`, code: 'free_used' });
    }
    usingFreeMark = true;
  }

  if (!prof?.is_admin) {
    if (!take(userBucket, uid, MARK_HOUR_USER, HOUR)) return res.status(429).json({ error: `Marking limit reached (${MARK_HOUR_USER}/hour). Try again later.` });
    if (!take(userDay, uid, MARK_DAY_USER, DAY))     return res.status(429).json({ error: `Daily marking limit reached (${MARK_DAY_USER}/day).` });
  }

  const { subject, board, paperCode, level, answersText, markSchemeText, images, attachments, msAttachments } = req.body ?? {};
  if (!subject || !board) return res.status(400).json({ error: 'Subject and exam board are required' });

  // Build the user content for Claude: a header, then text answers and/or images.
  const header = [
    `Subject: ${clampText(subject)}`,
    `Exam board: ${clampText(board)}`,
    level ? `Level: ${clampText(level)}` : null,
    paperCode ? `Paper: ${clampText(paperCode)}` : null,
  ].filter(Boolean).join('\n');

  const blocks = [{ type: 'text', text: `Mark this student's attempt.\n${header}` }];

  // ── Mark scheme (text + any image/PDF the student supplied) ──
  if (markSchemeText && String(markSchemeText).trim()) {
    blocks.push({ type: 'text', text: `Student-supplied mark scheme (use to align marking):\n${clampText(markSchemeText)}` });
  }
  if (Array.isArray(msAttachments) && msAttachments.length) {
    let added = 0;
    for (const a of msAttachments.slice(0, MAX_IMAGES)) {
      const b = toAttachmentBlock(a);
      if (b) { blocks.push(b); added++; }
    }
    if (added) blocks.push({ type: 'text', text: 'The file(s) above are the student-supplied mark scheme — align your marking to it.' });
  }

  // ── The student's answers (text + image/PDF attachments) ──
  if (answersText && String(answersText).trim()) {
    blocks.push({ type: 'text', text: `Student's typed answers:\n${clampText(answersText)}` });
  }
  // Accept the new `attachments` (mixed image/PDF) and the legacy `images` array.
  const answerFiles = [
    ...(Array.isArray(attachments) ? attachments : []),
    ...(Array.isArray(images) ? images : []),
  ].slice(0, MAX_IMAGES);
  if (answerFiles.length) {
    let added = 0;
    for (const a of answerFiles) {
      const b = toAttachmentBlock(a);
      if (b) { blocks.push(b); added++; }
    }
    if (added) blocks.push({ type: 'text', text: "The file(s) above are the student's own completed answers (photos/scans/PDF) — read and mark them." });
  }

  if (blocks.length === 1) return res.status(400).json({ error: 'Provide typed answers, or a photo/PDF/Word file of the paper.' });

  try {
    const text = await callClaudeMark({ userBlocks: blocks });
    const result = parseResult(text);
    if (!result) {
      return res.status(502).json({ error: 'Could not read a marking result — try clearer photos or typed answers.' });
    }

    // Build ready-to-Apply actions (client confirms before anything is written),
    // reusing the same caps-actions shapes the rest of the app already applies.
    const pct = Math.max(0, Math.min(100, parseInt(result.estimatedPercent, 10) || 0));
    const actions = [];
    actions.push({ type: 'log_paper', subject, board, paperCode: paperCode || null, pct, grade: result.estimatedGrade || null });
    for (const e of (Array.isArray(result.errors) ? result.errors : []).slice(0, 12)) {
      if (e && (e.topic || e.note)) actions.push({ type: 'log_error', subject, topic: String(e.topic || '').slice(0, 80), errorType: String(e.type || '').slice(0, 40), note: String(e.note || '').slice(0, 160) });
    }
    for (const topic of (Array.isArray(result.suggestedTopicsToRevise) ? result.suggestedTopicsToRevise : []).slice(0, 6)) {
      actions.push({ type: 'add_plan_task', subject, topic: String(topic).slice(0, 120), day: 'today', duration_min: 45 });
    }

    // Consume the weekly free mark only on a successful result.
    if (usingFreeMark) {
      await admin.from('user_profiles').update({ last_free_mark_at: new Date().toISOString() }).eq('id', uid);
    }

    return res.status(200).json({ result: { ...result, estimatedPercent: pct }, actions, meta: { estimate: true, free: usingFreeMark } });
  } catch (err) {
    console.error('Mark-paper error:', err.status, err.message);
    if (err.status === 429) return res.status(200).json({ error: 'The marker is busy right now — try again in a minute.' });
    return res.status(500).json({ error: 'Marking failed — try again.' });
  }
}
