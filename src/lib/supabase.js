import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
const key = typeof rawKey === 'string' ? rawKey.trim() : '';

const configured = url.startsWith('https://') && key.length > 30;

if (!configured) {
  console.warn('[Supabase] Missing or invalid env vars — running in local-only mode.');
}

export const supabase = configured
  ? createClient(url, key)
  : createClient('https://placeholder.supabase.co', 'placeholder-key-placeholder-key-placeholder-key');

export const isSupabaseConfigured = () => configured;
