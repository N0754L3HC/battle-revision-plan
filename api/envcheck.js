// TEMPORARY diagnostic — confirms the backend Supabase URL/key pair is valid.
// Exposes only the public project host + a boolean validity check. No secrets.
// Remove once the Groups/email "Unauthorized" issue is resolved.
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

  return res.status(200).json({
    backendSupabaseHost: host,
    expectedHost: 'denvsqnciiynklvsjxgn.supabase.co',
    hostMatchesFrontend: host === 'denvsqnciiynklvsjxgn.supabase.co',
    serviceKeyPresent: !!key,
    serviceKeyLength: key.length,
    settingsStatus,
    keyValidForUrl,
    fetchError,
  });
}
