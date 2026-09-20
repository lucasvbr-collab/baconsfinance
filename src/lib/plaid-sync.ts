import { dbTables } from "@/lib/db-tables";
import {
  importTransactions,
  type ImportResult,
  type IncomingTransaction,
} from "@/lib/import-transactions";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlaidApi, Transaction as PlaidTransaction } from "plaid";

export type BankItemRow = {
  id: string;
  household_id: string;
  user_id: string;
  plaid_item_id: string;
  access_token: string;
  institution_name: string;
  sync_cursor: string | null;
};

export type SyncItemResult = ImportResult & {
  itemId: string;
  institution: string;
  modified: number;
  removed: number;
};

function toIncoming(tx: PlaidTransaction): IncomingTransaction {
  // Convenção Plaid: amount > 0 = saída de dinheiro (despesa).
  const type = tx.amount >= 0 ? "expense" : "income";
  return {
    description: tx.merchant_name || tx.name || "Sem descrição",
    merchantName: tx.merchant_name ?? tx.name ?? null,
    amount: Math.abs(tx.amount),
    type,
    date: new Date(`${tx.date}T12:00:00`).toISOString(),
    source: "plaid",
    plaidTransactionId: tx.transaction_id,
  };
}

/**
 * Sincroniza um Item do Plaid via /transactions/sync (cursor incremental),
 * aplica added/modified/removed e passa os novos pela pipeline de
 * categorização automática.
 */
export async function syncBankItem(
  supabase: SupabaseClient,
  plaid: PlaidApi,
  item: BankItemRow,
  /** user_id usado nos inserts (sessão do utilizador ou dono do item no cron) */
  asUserId?: string,
): Promise<SyncItemResult> {
  const added: PlaidTransaction[] = [];
  const modified: PlaidTransaction[] = [];
  const removedIds: string[] = [];

  let cursor = item.sync_cursor ?? undefined;
  let hasMore = true;
  while (hasMore) {
    const { data } = await plaid.transactionsSync({
      access_token: item.access_token,
      cursor,
      count: 500,
    });
    added.push(...data.added);
    modified.push(...data.modified);
    removedIds.push(
      ...data.removed
        .map((r) => r.transaction_id)
        .filter((v): v is string => Boolean(v)),
    );
    cursor = data.next_cursor;
    hasMore = data.has_more;
  }

  // Pendentes (não liquidadas) ficam de fora; entram quando forem "posted".
  const postedAdded = added.filter((t) => !t.pending);

  // Removidas pelo banco (ex.: pendente cancelada)
  if (removedIds.length > 0) {
    await supabase
      .from(dbTables.transactions)
      .delete()
      .in("plaid_transaction_id", removedIds);
  }

  // Modificadas: atualiza valores mantendo categoria/status já definidos.
  let modifiedCount = 0;
  for (const tx of modified.filter((t) => !t.pending)) {
    const inc = toIncoming(tx);
    const { error } = await supabase
      .from(dbTables.transactions)
      .update({
        description: inc.description,
        merchant_name: inc.merchantName,
        amount: inc.amount,
        type: inc.type,
        date: inc.date,
      })
      .eq("plaid_transaction_id", tx.transaction_id);
    if (!error) modifiedCount += 1;
  }

  const result = await importTransactions(supabase, {
    householdId: item.household_id,
    userId: asUserId ?? item.user_id,
    transactions: postedAdded.map(toIncoming),
  });

  await supabase
    .from(dbTables.bankItems)
    .update({
      sync_cursor: cursor ?? null,
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", item.id);

  return {
    ...result,
    itemId: item.id,
    institution: item.institution_name,
    modified: modifiedCount,
    removed: removedIds.length,
  };
}
