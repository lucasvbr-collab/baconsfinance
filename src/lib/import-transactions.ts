import {
  aiCategorize,
  matchRule,
  normalizeMerchant,
  type AiCategorizeItem,
  type AiExample,
  type CategoryKind,
  type CategoryRule,
} from "@/lib/categorize";
import { dbCategoryEmbedKey, dbTables } from "@/lib/db-tables";
import { detectExclusions } from "@/lib/exclusions";
import { embedCategoryName } from "@/lib/supabase-joins";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Categoria usada quando nem regra nem IA resolvem.
 * Usa a primeira que existir; se nenhuma existir, cria a primeira da lista.
 */
export const FALLBACK_CATEGORY_NAMES = ["Extra", "Outros"] as const;

/** Quantos exemplos do histórico mandar para a IA. */
const MAX_AI_EXAMPLES = 60;

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
  excluded: number;
};

type CategoryRow = { id: string; name: string; kind: CategoryKind };

/**
 * Pipeline única de importação (Plaid e CSV):
 * 1. dedup por plaid_transaction_id / import_hash;
 * 2. transferências próprias e estornos NSF → "não conta" nos totais;
 * 3. regras de comerciante (grátis) → confirmadas;
 * 4. IA (gpt-4o-mini, com exemplos do histórico) → pending_review;
 * 5. resto → categoria fallback ("Extra") como pending_review.
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
  const empty = { inserted: 0, skipped: 0, pendingReview: 0, excluded: 0 };
  let txs = params.transactions.filter(
    (t) => Number.isFinite(t.amount) && t.amount > 0,
  );
  if (txs.length === 0) return empty;

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
  if (txs.length === 0) return { ...empty, skipped };

  // --- Categorias, regras e histórico ------------------------------------
  const [{ data: categories }, { data: rules }, { data: history }] =
    await Promise.all([
      supabase
        .from(dbTables.categories)
        .select("id, name, kind")
        .eq("household_id", householdId),
      supabase
        .from(dbTables.categoryRules)
        .select("id, pattern, category_id")
        .eq("household_id", householdId),
      supabase
        .from(dbTables.transactions)
        .select(`description, merchant_name, ${dbCategoryEmbedKey}(name)`)
        .eq("household_id", householdId)
        .eq("status", "confirmed")
        .eq("exclude_from_totals", false)
        .order("date", { ascending: false })
        .limit(300),
    ]);

  const catList = ((categories ?? []) as CategoryRow[]).map((c) => ({
    ...c,
    kind: c.kind === "income" ? ("income" as const) : ("expense" as const),
  }));
  const ruleList = (rules ?? []) as CategoryRule[];
  const catByLowerName = new Map(
    catList.map((c) => [c.name.toLocaleLowerCase("pt-BR"), c]),
  );

  const fallbackId = await ensureFallbackCategory(
    supabase,
    householdId,
    userId,
    catList,
    catByLowerName,
  );

  // --- 1) Exclusões (transferências / NSF) --------------------------------
  const excludedIdx = detectExclusions(txs);

  type Resolved = {
    tx: IncomingTransaction;
    categoryId: string;
    status: "confirmed" | "pending_review";
    exclude: boolean;
  };
  const resolved: Resolved[] = [];
  const unresolved: IncomingTransaction[] = [];

  txs.forEach((tx, i) => {
    const exclude = excludedIdx.has(i);
    const rule = matchRule(ruleList, tx.merchantName || tx.description);
    if (rule && catList.some((c) => c.id === rule.category_id)) {
      // --- 2) Regras ------------------------------------------------------
      resolved.push({
        tx,
        categoryId: rule.category_id,
        status: "confirmed",
        exclude,
      });
    } else if (exclude) {
      // Não conta nos totais: não vale gastar IA nem pedir revisão.
      resolved.push({ tx, categoryId: fallbackId, status: "confirmed", exclude });
    } else {
      unresolved.push(tx);
    }
  });

  // --- 3) IA em lote -------------------------------------------------------
  if (unresolved.length > 0) {
    const items: AiCategorizeItem[] = unresolved.map((t, i) => ({
      index: i,
      description: t.merchantName || t.description,
      type: t.type,
    }));
    const aiNames = await aiCategorize(
      items,
      catList.map((c) => ({ name: c.name, kind: c.kind })),
      buildExamples(history ?? []),
    );
    unresolved.forEach((tx, i) => {
      const name = aiNames.get(i);
      const categoryId = name
        ? (catByLowerName.get(name.toLocaleLowerCase("pt-BR"))?.id ?? fallbackId)
        : fallbackId;
      resolved.push({ tx, categoryId, status: "pending_review", exclude: false });
    });
  }

  // --- Insert ------------------------------------------------------------
  const rows = resolved.map(({ tx, categoryId, status, exclude }) => ({
    household_id: householdId,
    user_id: userId,
    description: tx.description,
    amount: tx.amount,
    date: tx.date,
    category_id: categoryId,
    type: tx.type,
    source: tx.source,
    status,
    exclude_from_totals: exclude,
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
    excluded: resolved.filter((r) => r.exclude).length,
  };
}

async function ensureFallbackCategory(
  supabase: SupabaseClient,
  householdId: string,
  userId: string,
  catList: CategoryRow[],
  catByLowerName: Map<string, CategoryRow>,
): Promise<string> {
  for (const name of FALLBACK_CATEGORY_NAMES) {
    const found = catByLowerName.get(name.toLocaleLowerCase("pt-BR"));
    if (found) return found.id;
  }
  const name = FALLBACK_CATEGORY_NAMES[0];
  const { data: created, error } = await supabase
    .from(dbTables.categories)
    .insert({
      household_id: householdId,
      user_id: userId,
      name,
      monthly_limit: 0,
      kind: "expense",
    })
    .select("id")
    .single();
  if (error || !created) {
    throw new Error(
      `Falha ao criar categoria "${name}": ${error?.message ?? "?"}`,
    );
  }
  const row: CategoryRow = { id: created.id as string, name, kind: "expense" };
  catList.push(row);
  catByLowerName.set(name.toLocaleLowerCase("pt-BR"), row);
  return row.id;
}

/** Um exemplo por comerciante normalizado, dos mais recentes. */
export function buildExamples(history: unknown[]): AiExample[] {
  const seen = new Set<string>();
  const out: AiExample[] = [];
  for (const raw of history) {
    const row = raw as Record<string, unknown>;
    const text = String(row.merchant_name || row.description || "").trim();
    const category = embedCategoryName(row);
    if (!text || !category) continue;
    const key = normalizeMerchant(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ description: text, category });
    if (out.length >= MAX_AI_EXAMPLES) break;
  }
  return out;
}
