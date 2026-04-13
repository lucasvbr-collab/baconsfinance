import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Garante que o utilizador tem um lar (cria um vazio se for o primeiro acesso).
 * Usa RPC `ensure_household_id_bf` (SECURITY DEFINER) para evitar RLS no
 * `insert(...).select()` em households antes de existir linha em membros.
 */
export async function ensureHouseholdId(
  supabase: SupabaseClient,
): Promise<string> {
  const { data, error } = await supabase.rpc("ensure_household_id_bf");
  if (error) throw new Error(error.message);
  if (data == null) throw new Error("Não foi possível obter o lar.");
  return data as string;
}
