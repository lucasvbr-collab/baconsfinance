import {
  aiCategorize,
  matchRule,
  type AiCategorizeItem,
  type CategoryRule,
} from "@/lib/categorize";
import { dbTables } from "@/lib/db-tables";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Categoria usada quando nem regra nem IA resolvem. */
export const FALLBACK_CATEGORY_NAME = "Outros";

export type IncomingTransaction = {
  description: string;
  merchantName: string | null;
  /** Valor absoluto, sempre positivo */
  amount: number;
  type: "income" | "expense";
  /** ISO string */
  date: string;
  source: "plaid" | "csv";
  plaidTransactionId?: string;
  importHash?: string;
};

export type ImportResult = {
  inserted: number;
  skipped: number;
  pendingReview: number;
};

/**
 * Pipeline única de importação (Plaid e CSV):
 * 1. dedup por plaid_transaction_id / import_hash;
 * 2. regras de comerciante (grátis) → confirmadas;
 * 3. IA (gpt-4o-mini) → pending_review;
 * 4. resto → categoria "Outros" como pending_review.
 */
export async function importTransactions(
  supabase: SupabaseClient,
  params: {
    householdId: string;
    userId: string;
    transactions: IncomingTransaction[];
  },
): Promise<ImportResult> {
  const { householdId, userId } = params;
  let txs = params.transactions.filter(
    (t) => Number.isFinite(t.amount) && t.amount > 0,
  );
  if (txs.length === 0) return { inserted: 0, skipped: 0, pendingReview: 0 };

  // --- Dedup -----------------------------------------------------------
  const plaidIds = txs
    .map((t) => t.plaidTransactionId)
    .filter((v): v is string => Boolean(v));
  const hashes = txs
    .map((t) => t.importHash)
    .filter((v): v is string => Boolean(v));

  const existingPlaid = new Set<string>();
  const existingHash = new Set<string>();

  if (plaidIds.length > 0) {
    const { data } = await supabase
      .from(dbTables.transactions)
      .select("plaid_transaction_id")
      .in("plaid_transaction_id", plaidIds);
    for (const row of data ?? []) {
      if (row.plaid_transaction_id) existingPlaid.add(row.plaid_transaction_id);
    }
  }
  if (hashes.length > 0) {
    const { data } = await supabase
      .from(dbTables.transactions)
      .select("import_hash")
      .eq("household_id", householdId)
      .in("import_hash", hashes);
    for (const row of data ?? []) {
      if (row.import_hash) existingHash.add(row.import_hash);
    }
  }

  const before = txs.length;
  txs = txs.filter((t) => {
    if (t.plaidTransactionId && existingPlaid.has(t.plaidTransactionId)) {
      return false;
    }
    if (t.importHash && existingHash.has(t.importHash)) return false;
    return true;
  });
  const skipped = before - txs.length;
  if (txs.length === 0) return { inserted: 0, skipped, pendingReview: 0 };

  // --- Categorias e regras ---------------------------------------------
  const [{ data: categories }, { data: rules }] = await Promise.all([
    supabase
      .from(dbTables.categories)
      .select("id, name")
      .eq("household_id", householdId),
    supabase
      .from(dbTables.categoryRules)
      .select("id, pattern, category_id")
      .eq("household_id", householdId),
  ]);

  const catList = (categories ?? []) as { id: string; name: string }[];
  const ruleList = (rules ?? []) as CategoryRule[];
  const catByLowerName = new Map(
    catList.map((c) => [c.name.toLocaleLowerCase("pt-BR"), c.id]),
  );

  // Garante a categoria fallback "Outros".
  let fallbackId = catByLowerName.get(
    FALLBACK_CATEGORY_NAME.toLocaleLowerCase("pt-BR"),
  );
  if (!fallbackId) {
    const { data: created, error } = await supabase
      .from(dbTables.categories)
      .insert({
        household_id: householdId,
        user_id: userId,
        name: FALLBACK_CATEGORY_NAME,
        monthly_limit: 0,
      })
      .select("id")
      .single();
    if (error || !created) {
      throw new Error(
        `Falha ao criar categoria "${FALLBACK_CATEGORY_NAME}": ${error?.message ?? "?"}`,
      );
    }
    fallbackId = created.id as string;
    catList.push({ id: fallbackId, name: FALLBACK_CATEGORY_NAME });
    catByLowerName.set(
      FALLBACK_CATEGORY_NAME.toLocaleLowerCase("pt-BR"),
      fallbackId,
    );
  }

  // --- 1) Regras --------------------------------------------------------
  type Resolved = {
    tx: IncomingTransaction;
    categoryId: string;
    status: "confirmed" | "pending_review";
  };
  const resolved: Resolved[] = [];
  const unresolved: IncomingTransaction[] = [];

  for (const tx of txs) {
    const rule = matchRule(ruleList, tx.merchantName || tx.description);
    if (rule && catList.some((c) => c.id === rule.category_id)) {
      resolved.push({ tx, categoryId: rule.category_id, status: "confirmed" });
    } else {
      unresolved.push(tx);
    }
  }

  // --- 2) IA em lote -----------------------------------------------------
  if (unresolved.length > 0) {
    const items: AiCategorizeItem[] = unresolved.map((t, i) => ({
      index: i,
      description: t.merchantName || t.description,
      type: t.type,
    }));
    const aiNames = await aiCategorize(
      items,
      catList.map((c) => c.name),
    );
    unresolved.forEach((tx, i) => {
      const name = aiNames.get(i);
      const categoryId = name
        ? (catByLowerName.get(name.toLocaleLowerCase("pt-BR")) ?? fallbackId)
        : fallbackId;
      resolved.push({ tx, categoryId, status: "pending_review" });
    });
  }

  // --- Insert ------------------------------------------------------------
  const rows = resolved.map(({ tx, categoryId, status }) => ({
    household_id: householdId,
    user_id: userId,
    description: tx.description,
    amount: tx.amount,
    date: tx.date,
    category_id: categoryId,
    type: tx.type,
    source: tx.source,
    status,
    merchant_name: tx.merchantName,
    plaid_transaction_id: tx.plaidTransactionId ?? null,
    import_hash: tx.importHash ?? null,
  }));

  const { error: insErr } = await supabase
    .from(dbTables.transactions)
    .insert(rows);
  if (insErr) throw new Error(`Falha ao inserir transações: ${insErr.message}`);

  return {
    inserted: rows.length,
    skipped,
    pendingReview: resolved.filter((r) => r.status === "pending_review").length,
  };
}
