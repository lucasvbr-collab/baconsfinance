"use server";

import { statementToIncoming } from "@/lib/card-statement-import";
import { dbTables } from "@/lib/db-tables";
import { ensureHouseholdId } from "@/lib/household";
import { logImport, notifyBudgetThresholds } from "@/lib/budget-notify";
import { importTransactions } from "@/lib/import-transactions";
import {
  CardStatementError,
  extractPdfText,
  parseRbcCardStatementText,
} from "@/lib/rbc-card-statement";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MAX_BYTES = 5_000_000;

function periodLabel(start: string, end: string): string {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };
  return `${fmt(start)} a ${fmt(end)}`;
}

export async function importCardStatementAction(formData: FormData): Promise<
  | { error: string }
  | {
      ok: true;
      inserted: number;
      skipped: number;
      pendingReview: number;
      period: string;
      newBalance: number;
    }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre de novo." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione o PDF da fatura." };
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "A fatura precisa ser o PDF baixado do RBC." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Arquivo grande demais (máx. 5 MB)." };
  }

  let statement;
  try {
    const text = await extractPdfText(new Uint8Array(await file.arrayBuffer()));
    statement = parseRbcCardStatementText(text);
  } catch (e) {
    if (e instanceof CardStatementError) return { error: e.message };
    return { error: "Não consegui ler este PDF. Baixe a fatura de novo no RBC e tente outra vez." };
  }

  const householdId = await ensureHouseholdId(supabase);

  const insertStatement = () =>
    supabase
      .from(dbTables.cardStatements)
      .insert({
        household_id: householdId,
        user_id: user.id,
        card_last4: statement.cardLast4,
        period_start: statement.periodStart,
        period_end: statement.periodEnd,
        previous_balance: statement.previousBalance,
        payments_credits: statement.paymentsCredits,
        purchases_debits: statement.purchasesDebits,
        new_balance: statement.newBalance,
        due_date: statement.dueDate,
      })
      .select("id")
      .single();

  let { data: row, error: insErr } = await insertStatement();

  if (insErr?.code === "23505") {
    // Fatura registrada sem nenhum lançamento = sobra de uma importação que
    // falhou no meio. Apaga e tenta de novo; com lançamentos, é duplicata real.
    const { data: existing } = await supabase
      .from(dbTables.cardStatements)
      .select("id")
      .eq("household_id", householdId)
      .eq("card_last4", statement.cardLast4)
      .eq("period_end", statement.periodEnd)
      .maybeSingle();
    if (existing) {
      const { count } = await supabase
        .from(dbTables.transactions)
        .select("id", { count: "exact", head: true })
        .eq("household_id", householdId)
        .eq("statement_id", existing.id);
      if (count === 0) {
        await supabase
          .from(dbTables.cardStatements)
          .delete()
          .eq("id", existing.id)
          .eq("household_id", householdId);
        ({ data: row, error: insErr } = await insertStatement());
      }
    }
  }

  if (insErr || !row) {
    if (insErr?.code === "23505") return { error: "Essa fatura já foi importada." };
    return { error: `Não foi possível guardar a fatura: ${insErr?.message ?? "erro desconhecido"}` };
  }

  try {
    const result = await importTransactions(supabase, {
      householdId,
      userId: user.id,
      transactions: statementToIncoming(statement, row.id as string),
    });
    await logImport(supabase, householdId, user.id, "card_statement", result.inserted);
    await notifyBudgetThresholds(supabase, householdId);
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    return {
      ok: true,
      inserted: result.inserted,
      skipped: result.skipped,
      pendingReview: result.pendingReview,
      period: periodLabel(statement.periodStart, statement.periodEnd),
      newBalance: statement.newBalance,
    };
  } catch (e) {
    // Sem lançamentos, a fatura não pode ficar registrada como importada.
    await supabase
      .from(dbTables.cardStatements)
      .delete()
      .eq("id", row.id)
      .eq("household_id", householdId);
    return { error: e instanceof Error ? e.message : "Falha ao importar a fatura." };
  }
}
