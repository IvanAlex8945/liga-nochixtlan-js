import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
  console.error(
    '[Supabase] NEXT_PUBLIC_SUPABASE_URL must be a valid REST URL (https://...)'
  );
}

/**
 * Singleton Supabase client for use in Server and Client Components.
 * Uses the public anon key — respects Row Level Security (RLS) policies.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
