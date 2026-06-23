// Shared AI usage + cost logging. Service-role writes to the ai_usage table so
// the admin can see heavy users, which feature they use, token spend and profit.
// Imported by the /api AI endpoints (chat, marker, planner).

// USD per 1,000,000 tokens. Matched by model-name substring.
function priceFor(model) {
  const m = (model || '').toLowerCase();
  if (m.includes('gemini')) return { in: 0.075, out: 0.30, cacheRead: 0.01875, cacheWrite: 0 };
  if (m.includes('haiku'))  return { in: 1,     out: 5,    cacheRead: 0.10,    cacheWrite: 1.25 };
  if (m.includes('opus'))   return { in: 15,    out: 75,   cacheRead: 1.50,    cacheWrite: 18.75 };
  return { in: 3, out: 15, cacheRead: 0.30, cacheWrite: 3.75 }; // sonnet / default
}

// Normalise Anthropic or Gemini usage objects to one shape.
export function normUsage(raw) {
  if (!raw) return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  if (raw.input_tokens != null || raw.output_tokens != null) {
    return {
      input: raw.input_tokens || 0,
      output: raw.output_tokens || 0,
      cacheRead: raw.cache_read_input_tokens || 0,
      cacheWrite: raw.cache_creation_input_tokens || 0,
    };
  }
  if (raw.promptTokenCount != null || raw.candidatesTokenCount != null) {
    return { input: raw.promptTokenCount || 0, output: raw.candidatesTokenCount || 0, cacheRead: 0, cacheWrite: 0 };
  }
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
}

export function aiCost(model, u) {
  const p = priceFor(model);
  return (u.input * p.in + u.output * p.out + u.cacheRead * p.cacheRead + u.cacheWrite * p.cacheWrite) / 1e6;
}

// Fire-and-forget: never let logging break a user request.
export async function logAiUsage(admin, { uid, feature, model, usageRaw }) {
  try {
    if (!admin) return;
    const u = normUsage(usageRaw);
    const cost = aiCost(model, u);
    await admin.from('ai_usage').insert({
      user_id: uid || null,
      feature,
      provider: (model || '').toLowerCase().includes('gemini') ? 'google' : 'anthropic',
      model: model || null,
      input_tokens: u.input,
      output_tokens: u.output,
      cache_read_tokens: u.cacheRead,
      cache_write_tokens: u.cacheWrite,
      cost_usd: Number(cost.toFixed(6)),
    });
  } catch (e) {
    console.error('logAiUsage failed:', e?.message);
  }
}
