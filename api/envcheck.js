// TEMPORARY diagnostic — confirms the backend Supabase URL/key pair is valid.
// Exposes only the public project host + a boolean validity check. No secrets.
// Remove once the Groups/email "Unauthorized" issue is resolved.
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_KEY ?? '';
  let host = null;
  try { host = url ? new URL(url).host : null; } catch { host = 'INVALID_URL'; }

  let settingsStatus = null, keyValidForUrl = null, fetchError = null;
  if (url && key) {
    try {
      const r = await fetch(`${url}/auth/v1/settings`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      settingsStatus = r.status;        // 200 = url+key are a valid pair; 401 = bad key for this url
      keyValidForUrl = r.status === 200;
    } catch (e) {
      fetchError = String(e?.message ?? e); // network/DNS error = url host wrong
    }
  }

  // End-to-end test of the exact getUser() path the API uses, with a real token.
  let selfTest = {};
  if (url && key && req.query?.e2e === '1') {
    try {
      const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const email = `envcheck+${Date.now()}@example.com`;
      const password = 'Tx9!' + Math.random().toString(36).slice(2) + 'Aa';
      const { data: created, error: cErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (cErr) { selfTest.createError = cErr.message; }
      else {
        const { data: si, error: sErr } = await admin.auth.signInWithPassword({ email, password });
        if (sErr) selfTest.signInError = sErr.message;
        else {
          const tok = si.session?.access_token;
          selfTest.gotToken = !!tok;
          const { data: gu, error: gErr } = await admin.auth.getUser(tok);
          selfTest.getUserOk = !!gu?.user && !gErr;
          selfTest.getUserError = gErr?.message ?? null;
        }
        await admin.auth.admin.deleteUser(created.user.id);
      }
    } catch (e) { selfTest.exception = String(e?.message ?? e); }
  }

  return res.status(200).json({
    backendSupabaseHost: host,
    expectedHost: 'denvsqnciiynklvsjxgn.supabase.co',
    hostMatchesFrontend: host === 'denvsqnciiynklvsjxgn.supabase.co',
    serviceKeyPresent: !!key,
    serviceKeyLength: key.length,
    settingsStatus,
    keyValidForUrl,
    fetchError,
    selfTest,
  });
}
