import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-supabase-url-here.supabase.co' &&
  supabaseUrl !== 'https://your-project-ref.supabase.co'
);

/**
 * Creates and returns a browser-side Supabase client.
 * Uses environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function createClient() {
  const url = supabaseUrl || 'https://placeholder-project.supabase.co';
  const key = supabaseAnonKey || 'placeholder-anon-key';

  if (!isSupabaseConfigured) {
    if (typeof window !== 'undefined') {
      console.warn(
        '[Waypoint] Supabase credentials not set or using placeholders. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
      );
    }
  }

  return createSupabaseClient(url, key);
}

export const supabase = createClient();
