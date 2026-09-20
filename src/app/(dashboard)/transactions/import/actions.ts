"use server";

import { ensureHouseholdId } from "@/lib/household";
import { importTransactions } from "@/lib/import-transactions";
import { parseRbcCsv } from "@/lib/rbc-csv";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function importRbcCsvAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um ficheiro CSV" };
  }
  if (file.size > 5_000_000) {
    return { error: "Ficheiro demasiado grande (máx. 5 MB)" };
  }

  const text = await file.text();
  let txs;
  try {
    txs = parseRbcCsv(text);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "CSV inválido" };
  }
  if (txs.length === 0) {
    return { error: "Nenhuma transação encontrada no CSV" };
  }

  const householdId = await ensureHouseholdId(supabase);
  try {
    const result = await importTransactions(supabase, {
      householdId,
      userId: user.id,
      transactions: txs,
    });
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    return { ok: true as const, ...result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha na importação" };
  }
}
