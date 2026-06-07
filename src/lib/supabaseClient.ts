import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// validateSupabaseUrl (v2.107+) throws if the URL doesn't start with http(s)://
// Use a no-op placeholder so the app renders even without real credentials.
const supabaseUrl = rawUrl?.startsWith('http') ? rawUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = rawKey && rawKey !== 'your_anon_key' ? rawKey : 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
