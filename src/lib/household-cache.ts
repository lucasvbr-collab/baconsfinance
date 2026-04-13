import { cache } from "react";
import { ensureHouseholdId } from "@/lib/household";
import { createClient } from "@/lib/supabase/server";

/** Um id de lar por pedido HTTP (cria lar na primeira vez). */
export const getMyHouseholdId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return ensureHouseholdId(supabase);
});
