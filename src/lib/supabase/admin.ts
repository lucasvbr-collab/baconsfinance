import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente com service role (ignora RLS). Usado apenas pelo cron de
 * sincronização. Requer SUPABASE_SERVICE_ROLE_KEY no ambiente.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada (necessária para o cron).",
    );
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
