import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key || url === 'your-project-url-here') {
  console.warn('[Supabase] Missing env vars — app runs in local-only mode.');
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder');

export const isSupabaseConfigured = () =>
  !!url && url !== 'your-project-url-here' && !!key && key !== 'your-anon-key-here';
