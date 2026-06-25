import { createClient } from '@supabase/supabase-js';
import { logAiUsage } from '../lib/aiUsage.js';

// A detailed mark of a long paper can take a while — give the function room so it
// doesn't time out mid-generation (Vercel clamps to the plan's max).
export const maxDuration = 300;

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
// Page budget (DB-backed, survives cold starts) — the real token-drain guard,
// since every PDF/image page costs ~1.5-3k Claude tokens.
const MAX_PAGES_REQ   = parseInt(process.env.MARK_PAGES_PER_REQUEST || '40',  10);
const MARK_PAGES_DAY  = parseInt(process.env.MARK_PAGES_PER_DAY     || '60',  10);
const MARK_PAGES_MONTH= parseInt(process.env.MARK_PAGES_PER_MONTH   || '300', 10); // paying fair-use cap

// Tiered caps: paying subscribers get the full allowance; trial / referral-week
// ("weekly pro") / free users — who aren't paying — are capped tight to bound
// AI cost. Free is also gated to 1 mark/week elsewhere; here we shrink its size.
const I = (k, d) => parseInt(process.env[k] || d, 10);
const TIER_CAPS = {
  paying:  { day: MARK_PAGES_DAY, month: MARK_PAGES_MONTH,          req: MAX_PAGES_REQ },
  trial:   { day: I('MARK_TRIAL_DAY','15'),   month: I('MARK_TRIAL_MONTH','45'),  req: MAX_PAGES_REQ },
  granted: { day: I('MARK_GRANT_DAY','15'),   month: I('MARK_GRANT_MONTH','60'),  req: MAX_PAGES_REQ },
  free:    { day: I('MARK_FREE_DAY','12'),    month: I('MARK_FREE_MONTH','60'),   req: I('MARK_FREE_REQ','12') },
};
function tierOf(prof) {
  if (prof?.is_admin) return 'admin';
  const s = prof?.subscription_status;
  if (s === 'pro' || s === 'active') return 'paying';
  if (s === 'trialing') return 'trial';
  if (prof?.referral_pro_until && new Date(prof.referral_pro_until).getTime() > Date.now()) return 'granted';
  return 'free';
}

// Limits on the payload Claude sees (cost + abuse control).
const MAX_IMAGES = 12;
const MAX_FILES  = 6;           // per area (answers / mark scheme) — matches the UI
const MAX_TEXT   = 16000;       // chars of typed answers / mark scheme
const MAX_IMG_B64 = 5_000_000;  // ~3.7MB decoded per image
const MAX_DOC_B64 = 14_000_000; // ~10MB decoded per PDF

// Large files don't go through this function's body (Vercel caps it at ~4.5MB).
// The browser uploads them to private Storage and sends a short-lived signed URL,
// which Claude fetches directly. We only ever accept URLs from our OWN project
// storage host — an SSRF guard so a crafted request can't make Claude fetch
// arbitrary internal URLs.
const SIGN_PREFIX = (process.env.SUPABASE_URL || '').replace(/\/+$/, '') + '/storage/v1/object/sign/paper-uploads/';
function toUrlBlock(item) {
  if (!item || typeof item.url !== 'string') return null;
  if (!item.url.startsWith(SIGN_PREFIX)) return null;
  return item.kind === 'pdf'
    ? { type: 'document', source: { type: 'url', url: item.url } }
    : { type: 'image',    source: { type: 'url', url: item.url } };
}

const MARK_SYSTEM = `You are a warm, encouraging UK GCSE/A-Level examiner and tutor, marking a student's OWN attempt at a past paper for revision. You are NOT producing an official result. Your goal: help the student clearly understand how they did and exactly how to improve, in plain, friendly language a teenager can follow.

RULES
- Mark in the style and standards of the stated exam board, but make clear every figure is an ESTIMATE for revision, never an official mark or grade.
- If the student supplied a mark scheme, align to it. If not, use your subject expertise. Never invent or claim to quote an official mark scheme you weren't given.
- Be THOROUGH. Go through EVERY question the student attempted — do not skip questions and do not shorten the feedback. The detailed question-by-question marking is the most useful part for the student, so give it properly.
- Write simply and kindly, like a supportive tutor sitting next to them. Short, clear sentences. No jargon — if a technical term is unavoidable, explain it in a few words. Talk about THIS student's actual work, not generic advice.
- Make EVERY piece of feedback scannable and pleasant to read — never a grey wall of text. Use short paragraphs with a blank line between them, **bold** for key terms and marking points, bullet lists for specific improvements, and ==highlight== (double equals) for the 1-3 most important things to fix. You can use __underline__ for emphasis too. Good visual hierarchy matters as much as the content.
- For each question explain in plain words: how many marks they earned and why, what they did well, and the exact step that would earn the missing marks.
- For maths and other working-based subjects: read the handwritten working line by line and award METHOD marks (M/A marks) for valid method even when the final answer is wrong; follow through a correct method from an earlier slip. Point to the exact line where it went wrong.
- Only show detailed working for questions the student did NOT get full marks on. For a question where they LOST marks: TRANSCRIBE their actual working into "yourWorking" as an ordered list of their lines/steps EXACTLY as they wrote them, tag each line's "status" ("correct", "error" = the line where it goes wrong, "warn" = risky/unclear/missing, or "neutral"), and add a short "note" only on lines that need one; then give the correct worked solution in "modelWorking" as clear ordered steps so they can compare side-by-side.
- For questions they got FULL marks on (earned == available), leave "yourWorking" and "modelWorking" empty ([]) — just a short encouraging "feedback" line. This keeps the report focused on what they need to fix.
ADAPT TO THE SUBJECT — mark in that subject's exam conventions (work out the subject from the stated subject/board and the paper itself):
- Maths / Further Maths / Physics & Chemistry calculations: step-by-step working; award method (M) and accuracy (A) marks and follow-through. Use yourWorking (their steps) + modelWorking (correct solution).
- Decision / Discrete Maths (D1/D2) — IMPORTANT: whenever a question is built on a graph, network, tree, bipartite matching, minimum spanning tree (Kruskal/Prim), Dijkstra shortest path, route inspection / Chinese postman, or a critical-path activity network, you MUST include a fenced \`\`\`graph diagram in THAT question's "feedback" (feedback is rendered as a real diagram; modelWorking is not). Draw the correct network and put highlight:true on the edges that form the answer (the MST / shortest path / matching / critical path); use directed:true with weights as durations for activity networks. Draw it EVEN IF the student's answer was wrong, so they can see the correct result visually. Do not just describe the network in words — show it.
- Computer Science: mark code/pseudocode and structured answers — correctness, logic, edge cases, efficiency/Big-O, trace tables, correct terminology. Show code as fenced code blocks with a language tag (e.g. \`\`\`python … \`\`\`) inside feedback/fix — both the student's snippet and a corrected version. Use a markdown table for trace tables. (Leave yourWorking/modelWorking empty when you've shown code blocks instead.)
- Biology / Chemistry / Physics written answers: mark against mark-scheme POINTS and the command word (state/describe/explain/compare/evaluate). Reward precise keywords and creditworthy points; flag vague or missing ones. Leave yourWorking/modelWorking empty unless there's a calculation — put the point-by-point breakdown in "feedback" and what to add in "fix".
- Essays / extended writing (English, History, RS, Geography, Psychology, Sociology, Business): mark by the board's Assessment Objectives / levels of response — argument, structure, evidence/quotes, analysis, evaluation, conclusion. Do NOT use yourWorking/modelWorking. Structure the "feedback" so it's a pleasure to read, NOT one dense block: open with a one-line verdict, then mini-headings per Assessment Objective (e.g. "**AO1 – Knowledge & understanding**") each followed by a SHORT paragraph, with a blank line between sections. Bold the key terms, ==highlight== the single most important thing to change, and where you reference the student's wording quote it in 'quotes'. Put 2-4 concrete, specific upgrades in "fix" as a bulleted list. You MAY use modelWorking as a short bulleted outline of what a top-band answer includes.
- Accounting / Economics / Business / Statistics: use MARKDOWN TABLES in feedback for ledgers/T-accounts, figures, data and comparisons (| Item | £ |\\n| --- | --- |\\n| ... |). Statistics/R/Python output can use fenced code blocks.
- For any subject with no real "working", leave yourWorking and modelWorking empty ([]) and rely on feedback, strengths and fix.
- Formatting tools available in feedback/fix/summary: LaTeX maths ($…$, $$…$$), fenced code blocks (\`\`\`lang), markdown tables, **bold**, bullet lists, and CHARTS. For a diagram a question expects (e.g. economics supply & demand, biology/physics results, geography data) draw it with a fenced \`\`\`chart block containing JSON — line/scatter: {"type":"line","title":"","xLabel":"","yLabel":"","series":[{"name":"Demand","points":[[0,10],[10,0]]},{"name":"Supply","points":[[0,0],[10,10]]}]}; bar: {"type":"bar","categories":["A","B"],"series":[{"name":"","values":[3,5]}]}. For Decision Maths and any node-edge diagram (graphs, trees, networks, MST via Kruskal/Prim, Dijkstra shortest path, critical-path activity networks) draw a fenced \`\`\`graph block of JSON: {"type":"graph","directed":false,"title":"","nodes":[{"id":"A","label":"A"},{"id":"B","label":"B"}],"edges":[{"from":"A","to":"B","weight":5,"highlight":true}]} - put highlight:true on the edges that form the MST / shortest path / critical path so they stand out; use directed:true with weights as durations for activity networks. Node x/y are optional (auto-laid-out if omitted). Plus **bold**, ==highlight==, __underline__, bullet lists and short paragraphs. Use whichever formats fit the subject; keep ordinary explanation as plain words.
- Write ALL mathematics in LaTeX so it renders beautifully: wrap inline maths in single dollar signs (e.g. $x^2+3x-4$) and standalone/displayed equations in double dollar signs (e.g. $$\\int_0^1 x^2\\,dx = \\tfrac{1}{3}$$). Use proper LaTeX commands (\\frac, \\sqrt, \\times, \\le, ^, _, etc.). Apply this in questionText, yourWorking text, modelWorking, feedback, fix and summary. Keep ordinary words as plain English OUTSIDE the dollar signs — only the maths goes in LaTeX. (Remember this is JSON, so every LaTeX backslash must be escaped as \\\\.)
- Spot recurring mistake patterns (e.g. "unit errors", "didn't show working", "sign error", "misread the command word") so the student can see their habits.
- Do NOT do the student's coursework/NEA. This is past-paper feedback only.
- LENGTH: cover EVERY question, but keep each one tight so the whole paper fits in one response — model answers to the essential marking points only, feedback 1-2 sentences. Briefly covering all questions beats exhaustively detailing a few and getting cut off. (This matters most for blank/whole-paper walkthroughs.)

OUTPUT — return ONLY a single JSON object, no prose around it:
{
  "paperName": "<short label for THIS paper, read from the paper itself if a title/code/date is visible (e.g. 'Edexcel Maths Paper 1, June 2022'); otherwise a sensible default like '<subject> practice paper'. Max 60 chars.>",
  "detectedSubject": "<the ACTUAL academic subject of THIS paper, worked out from its content — do NOT just echo the subject label you were handed, because the student often leaves the form's default subject selected. If you were given a list of the subjects the student tracks, return the EXACT one from that list that matches this paper; otherwise your best one-word label (e.g. 'Physics', 'Economics', 'Further Maths'). Null only if genuinely unidentifiable.>",
  "estimatedPercent": <int 0-100>,
  "estimatedGrade": "<board-appropriate grade or null>",
  "confidence": "low|medium|high",
  "summary": "<3-4 warm, plain-English sentences: how they did overall and the single biggest thing to focus on next>",
  "strengths": ["<specific thing they genuinely did well>", "..."],
  "questions": [{
    "q":"<question label, e.g. Q3 or Q3a>",
    "questionText":"<a brief plain transcription of what the question asked, for context (or \"\")>",
    "earned":<int>, "available":<int>,
    "yourWorking":[{"text":"<one of the student's lines/steps, as they wrote it>","status":"correct|error|warn|neutral","note":"<short annotation if this line needs one, else omit>"}],
    "modelWorking":["<step 1 of the correct worked solution>","<step 2>","..."],
    "feedback":"<2-4 plain sentences: what they did and why they earned these marks>",
    "fix":"<one clear, specific step to get the marks they missed — use \"\" if they got full marks>"
  }],
  "errors": [{"topic":"<short topic>","type":"<error type>","note":"<plain one-line explanation of the mistake and how to avoid it next time>"}],
  "suggestedTopicsToRevise": ["<short topic>", "..."]
}
Cover every attempted question and be generous with helpful detail in "feedback" and "fix". If you genuinely cannot read the work, set confidence "low" and say so kindly in the summary.`;

function clampText(s) { return String(s ?? '').slice(0, MAX_TEXT); }

// Decide which subject to LOG the paper under. The form's subject dropdown
// defaults to the student's first subject and is easily left unchanged, so a
// physics paper can get logged under (say) Further Maths. Claude reads the
// actual subject off the paper ("detectedSubject"); trust it only when it maps
// to one of the subjects the student tracks, otherwise keep their selection.
function pickLoggedSubject(detected, selected, tracked) {
  const list = Array.isArray(tracked) ? tracked.filter(t => typeof t === 'string' && t.trim()) : [];
  if (!detected || typeof detected !== 'string') return selected;
  const d = detected.trim().toLowerCase();
  if (!d) return selected;
  const hit = list.find(t => t.toLowerCase() === d)
           || list.find(t => t.toLowerCase().includes(d) || d.includes(t.toLowerCase()));
  return hit || selected; // never log under a subject the student doesn't track
}

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

// Transient upstream failures we should silently retry rather than fail the
// student on: Anthropic/Cloudflare blips (520/522/524 = empty/timeout from the
// origin, 529 = overloaded), gateway/5xx, and rate-limit (429). A big paper is
// exactly when these one-off hiccups appear, and a quick retry usually clears.
const RETRYABLE = new Set([429, 500, 502, 503, 504, 520, 522, 524, 529]);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function callClaudeMark({ userBlocks, model }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const body = JSON.stringify({
    // Generous output budget — a full-paper walkthrough (esp. a blank paper
    // where every answer is modelled) is long, and a truncated reply can't be
    // parsed as JSON.
    model, max_tokens: 24000, temperature: 0.2,
    // Cache the long system prompt so repeat marks pay ~90% less for it.
    system: [{ type: 'text', text: MARK_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userBlocks }],
  });

  // Up to 3 attempts. Backoff is short so we stay well inside maxDuration even
  // when a mark itself is slow. Network errors (fetch throws) are retried too.
  const DELAYS = [1500, 4000];
  let lastErr = null;
  for (let attempt = 0; attempt <= DELAYS.length; attempt++) {
    let r;
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body,
      });
    } catch (netErr) {
      // DNS/connection reset/socket hangup — treat as retryable.
      lastErr = Object.assign(new Error(`Claude network error: ${netErr.message}`), { status: 0 });
      if (attempt < DELAYS.length) { await sleep(DELAYS[attempt]); continue; }
      throw lastErr;
    }
    if (r.ok) {
      const d = await r.json();
      const text = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      return { text, usage: d.usage, truncated: d.stop_reason === 'max_tokens' };
    }
    const txt = await r.text();
    lastErr = Object.assign(new Error(`Claude ${r.status}: ${txt.slice(0, 200)}`), { status: r.status });
    if (RETRYABLE.has(r.status) && attempt < DELAYS.length) {
      console.warn(`Mark-paper: Claude ${r.status}, retry ${attempt + 1}/${DELAYS.length}`);
      await sleep(DELAYS[attempt]);
      continue;
    }
    throw lastErr; // non-retryable (e.g. 400 bad request, 401) or out of attempts
  }
  throw lastErr;
}

// Pull the first JSON object out of the model's reply, defensively.
function parseResult(text) {
  if (!text) return null;
  let raw = text.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const start = raw.indexOf('{');
  if (start === -1) return null;
  let body = raw.slice(start);
  const end = body.lastIndexOf('}');
  let candidate = end !== -1 ? body.slice(0, end + 1) : body;

  const tryParse = (s) => { try { return JSON.parse(s); } catch { return null; } };
  // 1) straight, 2) with trailing commas stripped.
  let out = tryParse(candidate) || tryParse(candidate.replace(/,\s*([}\]])/g, '$1'));
  if (out) return out;

  // 3) Salvage a truncated reply: close any open [ and { (ignoring brackets
  // inside strings) so a cut-off JSON object still yields usable feedback.
  const stack = [];
  let inStr = false, esc = false;
  for (const ch of body) {
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') stack.pop();
  }
  let fixed = body.replace(/,\s*$/, '');
  if (inStr) fixed += '"';
  for (let i = stack.length - 1; i >= 0; i--) fixed += stack[i] === '{' ? '}' : ']';
  return tryParse(fixed.replace(/,\s*([}\]])/g, '$1'));
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

  // Pro gate — same 3 signals as the rest of the app.
  const { data: prof } = await admin.from('user_profiles')
    .select('subscription_status,referral_pro_until,is_admin,free_marks_used').eq('id', uid).single();
  const isPro = prof?.is_admin
    || ['pro', 'trialing', 'active'].includes(prof?.subscription_status)
    || (prof?.referral_pro_until && new Date(prof.referral_pro_until).getTime() > Date.now());

  // Free tier is a TASTE: a small lifetime number of marks (default 3), then
  // upgrade. Tracked by user_profiles.free_marks_used (incremented on success
  // below). Checked before the expensive Claude call so we never burn tokens
  // for a user who's already over. Pro/trial/granted/admin are unaffected.
  const usingFreeMark = !isPro;
  const FREE_MARK_LIFETIME = parseInt(process.env.FREE_MARK_LIFETIME || '3', 10);
  if (usingFreeMark && (prof?.free_marks_used || 0) >= FREE_MARK_LIFETIME) {
    return res.status(402).json({
      error: `You've used your ${FREE_MARK_LIFETIME} free AI marks. Upgrade to Commander for unlimited marking.`,
      code: 'free_limit' });
  }

  if (!prof?.is_admin) {
    if (!take(userBucket, uid, MARK_HOUR_USER, HOUR)) return res.status(429).json({ error: `Marking limit reached (${MARK_HOUR_USER}/hour). Try again later.` });
    if (!take(userDay, uid, MARK_DAY_USER, DAY))     return res.status(429).json({ error: `Daily marking limit reached (${MARK_DAY_USER}/day).` });
  }

  const { subject, board, paperCode, level, answersText, markSchemeText, images, attachments, msAttachments,
          attachmentUrls, msAttachmentUrls, trackedSubjects } = req.body ?? {};
  if (!subject || !board) return res.status(400).json({ error: 'Subject and exam board are required' });

  // The subjects this student tracks — lets Claude pick the RIGHT one to log
  // under instead of trusting the form's (often unchanged) default.
  const trackedList = Array.isArray(trackedSubjects)
    ? trackedSubjects.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim().slice(0, 60)).slice(0, 24)
    : [];

  // Paths to remove from Storage once Claude has read them (privacy + housekeeping).
  const cleanupPaths = [...(Array.isArray(attachmentUrls) ? attachmentUrls : []),
                        ...(Array.isArray(msAttachmentUrls) ? msAttachmentUrls : [])]
    .map(a => (a && typeof a.path === 'string') ? a.path : null)
    .filter(p => p && p.startsWith(uid + '/'));

  // Page budget — every PDF/image page costs Claude tokens. The client counts PDF
  // pages (pdf.js); we floor it at the file count so a missing/under-reported count
  // still costs at least 1 unit per file. Anthropic itself hard-caps requests at
  // 100 pages / 32MB, so even a client-bypasser is bounded. Enforced in the DB
  // (atomic, survives cold starts) so it can't be reset by retrying; counted on
  // attempt, not success, so a failed parse can't be farmed.
  const fileCount =
      (Array.isArray(attachmentUrls)   ? attachmentUrls.length   : 0)
    + (Array.isArray(msAttachmentUrls) ? msAttachmentUrls.length : 0)
    + (Array.isArray(attachments)      ? attachments.length      : 0)
    + (Array.isArray(images)           ? images.length           : 0)
    + (Array.isArray(msAttachments)    ? msAttachments.length    : 0);
  if (fileCount > 2 * MAX_FILES) return res.status(400).json({ error: `Too many files in one go (max ${2 * MAX_FILES}).` });
  const claimedPages = Math.max(0, parseInt(req.body?.pages, 10) || 0);
  const pageUnits = Math.max(claimedPages, fileCount);

  // Tiered allowance — paying subscribers full, trial/referral/free tight.
  const tier = tierOf(prof);
  const caps = tier === 'admin' ? { day: 1e9, month: 1e9, req: MAX_PAGES_REQ } : TIER_CAPS[tier];
  if (pageUnits > caps.req) {
    return res.status(400).json({
      error: tier === 'free'
        ? `Free marking covers up to ${caps.req} pages — upgrade to Pro to mark full papers in one go.`
        : `That's too many pages at once (max ${caps.req}). Mark one paper at a time.`,
      code: 'pages_req' });
  }
  if (pageUnits > 0) {
    // Record usage for EVERYONE so the allowance bar is consistent across
    // sessions; admins get effectively-infinite caps so they're never blocked.
    const { data: code, error: bumpErr } = await admin.rpc('bump_mark_usage',
      { p_uid: uid, p_add: pageUnits, p_day_cap: caps.day, p_month_cap: caps.month });
    if (bumpErr) { console.error('bump_mark_usage error:', bumpErr.message); return res.status(500).json({ error: 'Marking failed — try again.' }); }
    if (code === 'day')   return res.status(429).json({ error: `Daily marking limit reached (${caps.day} pages/day). Resets tomorrow.${tier !== 'paying' ? ' Upgrade to Pro for more.' : ''}`, code: 'pages_day' });
    if (code === 'month') return res.status(429).json({ error: `You've reached this ${tier === 'paying' ? "month's fair-use" : 'period’s'} marking limit (${caps.month} pages).${tier !== 'paying' ? ' Upgrade to Pro for the full monthly allowance.' : ' Resets next month.'}`, code: 'pages_month' });
  }

  // Build the user content for Claude: a header, then text answers and/or images.
  const header = [
    `Subject: ${clampText(subject)}`,
    `Exam board: ${clampText(board)}`,
    level ? `Level: ${clampText(level)}` : null,
    paperCode ? `Paper: ${clampText(paperCode)}` : null,
  ].filter(Boolean).join('\n');

  // Tell Claude the selected subject may be a stale default and to identify the
  // real one from the paper (mapping to a tracked subject when we have the list).
  const subjectHint = `The student picked "${clampText(subject)}" in the form, but they may have left the default selected — work out the ACTUAL subject of THIS paper from its content and return it as detectedSubject.`
    + (trackedList.length ? ` The subjects they track are: ${trackedList.join(', ')}. detectedSubject MUST be the exact one of these that fits this paper (or "${clampText(subject)}" if you truly can't tell).` : '');

  const blocks = [{ type: 'text', text: `Mark this student's attempt.\n${header}\n\n${subjectHint}` }];

  // ── Mark scheme (text + any image/PDF the student supplied) ──
  if (markSchemeText && String(markSchemeText).trim()) {
    blocks.push({ type: 'text', text: `Student-supplied mark scheme (use to align marking):\n${clampText(markSchemeText)}` });
  }
  {
    let added = 0;
    for (const a of (Array.isArray(msAttachmentUrls) ? msAttachmentUrls : []).slice(0, MAX_FILES)) {
      const b = toUrlBlock(a);
      if (b) { blocks.push(b); added++; }
    }
    for (const a of (Array.isArray(msAttachments) ? msAttachments : []).slice(0, MAX_IMAGES)) {
      const b = toAttachmentBlock(a);
      if (b) { blocks.push(b); added++; }
    }
    if (added) blocks.push({ type: 'text', text: 'The file(s) above are the student-supplied mark scheme — align your marking to it.' });
  }

  // ── The student's answers (text + image/PDF attachments) ──
  if (answersText && String(answersText).trim()) {
    blocks.push({ type: 'text', text: `Student's typed answers:\n${clampText(answersText)}` });
  }
  // Preferred path: signed Storage URLs (handles large PDFs — no body-size limit).
  // Also accept the legacy inline base64 arrays for older clients.
  {
    let added = 0;
    for (const a of (Array.isArray(attachmentUrls) ? attachmentUrls : []).slice(0, MAX_FILES)) {
      const b = toUrlBlock(a);
      if (b) { blocks.push(b); added++; }
    }
    const legacyFiles = [
      ...(Array.isArray(attachments) ? attachments : []),
      ...(Array.isArray(images) ? images : []),
    ].slice(0, MAX_IMAGES);
    for (const a of legacyFiles) {
      const b = toAttachmentBlock(a);
      if (b) { blocks.push(b); added++; }
    }
    if (added) blocks.push({ type: 'text', text: "The file(s) above are the student's own completed answers (photos/scans/PDF) — read and mark them." });
  }

  if (blocks.length === 1) return res.status(400).json({ error: 'Provide typed answers, or a photo/PDF/Word file of the paper.' });

  try {
    // Sonnet for everyone — the detailed marking quality is what retains
    // students. Cost is held down by prompt caching + only transcribing working
    // on lost-mark questions, not by downgrading the model.
    const model = process.env.ANTHROPIC_MODEL_MARK || 'claude-sonnet-4-6';
    const { text, usage, truncated } = await callClaudeMark({ userBlocks: blocks, model });
    await logAiUsage(admin, { uid, feature: 'marker', model, usageRaw: usage });
    const result = parseResult(text);
    if (!result) {
      // Don't dead-end the student — if Caps wrote feedback we just couldn't
      // structure, show it as-is (nothing auto-logged). Only error on truly empty.
      const plain = (text || '').replace(/```/g, '').trim();
      if (plain.length > 40) {
        return res.status(200).json({
          result: { estimatedPercent: null, estimatedGrade: null, confidence: 'low',
            summary: plain.slice(0, 2000), questions: [], errors: [], suggestedTopicsToRevise: [] },
          actions: [], meta: { estimate: true, free: usingFreeMark, unstructured: true },
        });
      }
      return res.status(502).json({ error: 'Caps couldn’t produce feedback this time — please try again in a moment.' });
    }

    // Drop any half-written trailing question from a truncated reply so the UI
    // never shows a broken stub card.
    if (Array.isArray(result.questions)) {
      result.questions = result.questions.filter(q => q && (
        q.feedback || (Array.isArray(q.modelWorking) && q.modelWorking.length)
        || (Array.isArray(q.yourWorking) && q.yourWorking.length) || q.available != null));
      // If the response hit the token ceiling, tell the student gently rather
      // than silently stopping mid-paper.
      if (truncated && result.questions.length) {
        result.summary = (result.summary || '') +
          `\n\n_Heads up: this paper was long, so the walkthrough stops after ${result.questions.length} question${result.questions.length === 1 ? '' : 's'}. Upload a few questions at a time to get the full set._`;
      }
    }

    // Build ready-to-Apply actions (client confirms before anything is written),
    // reusing the same caps-actions shapes the rest of the app already applies.
    const pct = Math.max(0, Math.min(100, parseInt(result.estimatedPercent, 10) || 0));
    const actions = [];
    // Prefer what the student typed; else the name Caps read off the paper; else
    // let the client fall back to a dated label. So a paper is always named.
    const resolvedPaper = (paperCode && String(paperCode).trim())
      || (result.paperName && String(result.paperName).trim().slice(0, 80))
      || null;
    // Log under the subject Caps actually read off the paper (mapped to a tracked
    // subject), not the form default — so a physics paper stops landing under
    // Further Maths. All three action types use the same resolved subject so the
    // score, errors and plan tasks stay together.
    const loggedSubject = pickLoggedSubject(result.detectedSubject, subject, trackedList);
    actions.push({ type: 'log_paper', subject: loggedSubject, board, paperCode: resolvedPaper, pct, grade: result.estimatedGrade || null });
    for (const e of (Array.isArray(result.errors) ? result.errors : []).slice(0, 12)) {
      if (e && (e.topic || e.note)) actions.push({ type: 'log_error', subject: loggedSubject, topic: String(e.topic || '').slice(0, 80), errorType: String(e.type || '').slice(0, 40), note: String(e.note || '').slice(0, 160) });
    }
    for (const topic of (Array.isArray(result.suggestedTopicsToRevise) ? result.suggestedTopicsToRevise : []).slice(0, 6)) {
      actions.push({ type: 'add_plan_task', subject: loggedSubject, topic: String(topic).slice(0, 120), day: 'today', duration_min: 45 });
    }

    // Burn one lifetime free mark — only on success, so a failed mark never
    // costs the user one. Atomic via RPC. Report the remaining count back.
    let freeRemaining = null;
    if (usingFreeMark) {
      const { data: used } = await admin.rpc('increment_free_marks', { p_uid: uid });
      if (typeof used === 'number') freeRemaining = Math.max(0, FREE_MARK_LIFETIME - used);
    }

    // Tell the client if we logged under a different subject than was selected,
    // so it can update the on-screen labels and reassure the student.
    const subjectCorrected = loggedSubject && loggedSubject !== subject ? loggedSubject : null;
    return res.status(200).json({ result: { ...result, estimatedPercent: pct }, actions, meta: { estimate: true, free: usingFreeMark, freeRemaining, freeLimit: FREE_MARK_LIFETIME, loggedSubject, subjectCorrected } });
  } catch (err) {
    console.error('Mark-paper error:', err.status, err.message);
    // Transient upstream blip that survived all retries (overload/gateway/network)
    // — reassure the student it's not their paper and a retry will likely work.
    if (err.status === 429 || RETRYABLE.has(err.status) || err.status === 0) {
      // The pages were charged on attempt (anti-farming). A transient blip is
      // NOT the student's fault, so give those pages back — they got no feedback.
      if (pageUnits > 0) {
        try { await admin.rpc('refund_mark_usage', { p_uid: uid, p_sub: pageUnits }); }
        catch (e) { console.error('refund_mark_usage failed:', e?.message); }
      }
      return res.status(503).json({
        error: 'Caps is overloaded right now, not a problem with your paper. Give it a few seconds and tap Mark again — your upload is fine.',
        code: 'busy' });
    }
    return res.status(500).json({ error: 'Marking failed — try again.' });
  } finally {
    // Claude has already fetched the URLs by now — remove the uploaded files.
    if (cleanupPaths.length) {
      try { await admin.storage.from('paper-uploads').remove(cleanupPaths); }
      catch (e) { console.error('Mark-paper cleanup failed:', e?.message); }
    }
  }
}
