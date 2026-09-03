import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
  console.error(
    '[Supabase] NEXT_PUBLIC_SUPABASE_URL must be a valid REST URL (https://...)'
  );
}

/**
 * Retorna el cliente Supabase adecuado para el entorno de ejecucion actual.
 * En el navegador, reutiliza el singleton createBrowserClient de @supabase/ssr
 * para que las cookies HTTP, la sesion y el token JWT de Auth se compartan
 * entre login, middleware y todas las mutaciones del panel administrativo.
 * En el servidor (lib/public-data.ts, scripts o pre-renderizado SSR),
 * utiliza createClient de @supabase/supabase-js con la clave anon publica.
 */
export function getSupabaseClient(): SupabaseClient {
  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    return createBrowserClient();
  }
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Cliente Supabase singleton para uso en componentes cliente y paginas admin.
 * Reemplazo 100% compatible para todas las importaciones `import { supabase } from '@/lib/supabase'`.
 */
export const supabase: SupabaseClient = getSupabaseClient();

export { createClient } from '@/lib/supabase/client';
