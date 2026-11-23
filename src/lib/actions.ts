"use server";

import { dbTables } from "@/lib/db-tables";
import { notifyBudgetThresholds } from "@/lib/budget-notify";
import { ensureHouseholdId } from "@/lib/household";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function updateProfileName(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from(dbTables.profiles)
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function createHouseholdInvite() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const householdId = await ensureHouseholdId(supabase);
  const token = randomBytes(24).toString("hex");

  const { error } = await supabase.from(dbTables.householdInvites).insert({
    household_id: householdId,
    token,
    created_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true as const, token };
}

export async function acceptHouseholdInvite(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const t = token.trim();
  if (!t) return { error: "Código em falta" };

  const { data, error } = await supabase.rpc("accept_household_invite_bf", {
    p_token: t,
  });

  if (error) return { error: error.message };
  const row = data as { ok?: boolean; error?: string; message?: string };
  if (!row?.ok) {
    if (row?.error === "invalid_or_expired") return { error: "Convite inválido ou expirado." };
    if (row?.error === "leave_shared_first")
      return { error: "Sai do outro lar partilhado antes de aceitar este convite (ou contacta suporte)." };
    if (row?.error === "not_authenticated") return { error: "Sessão expirada." };
    return { error: row?.error ?? "Não foi possível aceitar o convite." };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/join");
  return { ok: true as const };
}

export async function createCategory(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const householdId = await ensureHouseholdId(supabase);
  const name = String(formData.get("name") ?? "").trim();
  const limitRaw = String(formData.get("monthly_limit") ?? "0");
  const monthly_limit = Number.parseFloat(limitRaw.replace(",", ".")) || 0;

  const kind = String(formData.get("kind") ?? "expense") === "income" ? "income" : "expense";

  if (!name) return { error: "Nome obrigatório" };

  const { error } = await supabase.from(dbTables.categories).insert({
    household_id: householdId,
    user_id: user.id,
    name,
    monthly_limit,
    kind,
  });

  if (error) {
    if (error.code === "23505") return { error: "Já existe categoria com esse nome" };
    return { error: error.message };
  }
  revalidatePath("/categories");
  revalidatePath("/transactions/new");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateCategoryLimit(categoryId: string, monthly_limit: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const householdId = await ensureHouseholdId(supabase);

  const { error } = await supabase
    .from(dbTables.categories)
    .update({ monthly_limit })
    .eq("id", categoryId)
    .eq("household_id", householdId);

  if (error) return { error: error.message };
  revalidatePath("/categories");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateCategoryBudget(
  categoryId: string,
  monthly_limit: number,
  target_percent: number,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const householdId = await ensureHouseholdId(supabase);
  const pct = Math.max(0, Math.min(100, target_percent));

  const { error } = await supabase
    .from(dbTables.categories)
    .update({ monthly_limit, target_percent: pct })
    .eq("id", categoryId)
    .eq("household_id", householdId);

  if (error) return { error: error.message };
  revalidatePath("/categories");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function approvePendingTransactions(ids?: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const householdId = await ensureHouseholdId(supabase);

  let q = supabase
    .from(dbTables.transactions)
    .update({ status: "confirmed" })
    .eq("household_id", householdId)
    .eq("status", "pending_review");

  if (ids && ids.length > 0) {
    q = q.in("id", ids);
  }

  const { error } = await q;
  if (error) return { error: error.message };
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function upsertCategoryRule(pattern: string, categoryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const householdId = await ensureHouseholdId(supabase);
  const { normalizeMerchant } = await import("@/lib/categorize");
  const normalized = normalizeMerchant(pattern);
  if (!normalized) return { error: "Padrão inválido" };

  const { error } = await supabase.from(dbTables.categoryRules).upsert(
    {
      household_id: householdId,
      user_id: user.id,
      pattern: normalized,
      category_id: categoryId,
    },
    { onConflict: "household_id,pattern" },
  );

  if (error) return { error: error.message };
  revalidatePath("/categories");
  revalidatePath("/transactions");
  return { ok: true };
}

export async function updateCategoryKind(
  categoryId: string,
  kind: "income" | "expense",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const householdId = await ensureHouseholdId(supabase);

  const { error } = await supabase
    .from(dbTables.categories)
    .update({ kind: kind === "income" ? "income" : "expense" })
    .eq("id", categoryId)
    .eq("household_id", householdId);

  if (error) return { error: error.message };
  revalidatePath("/categories");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteCategoryRule(ruleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const householdId = await ensureHouseholdId(supabase);

  const { error } = await supabase
    .from(dbTables.categoryRules)
    .delete()
    .eq("id", ruleId)
    .eq("household_id", householdId);

  if (error) return { error: error.message };
  revalidatePath("/categories");
  return { ok: true };
}

export async function deleteCategory(categoryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const householdId = await ensureHouseholdId(supabase);

  const { count, error: cErr } = await supabase
    .from(dbTables.transactions)
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId)
    .eq("household_id", householdId);

  if (cErr) return { error: cErr.message };
  if (count && count > 0) {
    return { error: "Não é possível excluir: existem transações nesta categoria." };
  }

  const { error } = await supabase
    .from(dbTables.categories)
    .delete()
    .eq("id", categoryId)
    .eq("household_id", householdId);

  if (error) return { error: error.message };
  revalidatePath("/categories");
  revalidatePath("/transactions/new");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function createTransaction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const householdId = await ensureHouseholdId(supabase);
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number.parseFloat(String(formData.get("amount") ?? "0"));
  const dateStr = String(formData.get("date") ?? "");
  const category_id = String(formData.get("category_id") ?? "");
  const type = String(formData.get("type") ?? "expense") as "income" | "expense";

  if (!category_id) return { error: "Escolha uma categoria" };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Valor inválido" };

  const date = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();

  const { error } = await supabase.from(dbTables.transactions).insert({
    household_id: householdId,
    user_id: user.id,
    description,
    amount,
    date: date.toISOString(),
    category_id,
    type: type === "income" ? "income" : "expense",
  });

  if (error) return { error: error.message };
  await notifyBudgetThresholds(supabase, householdId);
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { ok: true as const };
}

export async function insertTransaction(data: {
  description: string;
  amount: number;
  date: string;
  category_id: string;
  type: "income" | "expense";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const householdId = await ensureHouseholdId(supabase);

  if (!data.category_id) return { error: "Escolha uma categoria" };
  if (!Number.isFinite(data.amount) || data.amount <= 0) return { error: "Valor inválido" };

  const { data: row, error } = await supabase
    .from(dbTables.transactions)
    .insert({
      household_id: householdId,
      user_id: user.id,
      description: data.description,
      amount: data.amount,
      date: data.date,
      category_id: data.category_id,
      type: data.type,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  await notifyBudgetThresholds(supabase, householdId);
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { ok: true as const, id: row.id };
}

export async function updateTransaction(transactionId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const householdId = await ensureHouseholdId(supabase);
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number.parseFloat(String(formData.get("amount") ?? "0"));
  const dateStr = String(formData.get("date") ?? "");
  const category_id = String(formData.get("category_id") ?? "");
  const type = String(formData.get("type") ?? "expense") as "income" | "expense";

  if (!category_id) return { error: "Escolha uma categoria" };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Valor inválido" };

  const date = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();

  const excludeFromTotals =
    String(formData.get("exclude_from_totals") ?? "") === "1";
  const learnRule = String(formData.get("learn_rule") ?? "") === "1";
  const merchantHint = String(formData.get("merchant_name") ?? "").trim();

  const { error } = await supabase
    .from(dbTables.transactions)
    .update({
      description,
      amount,
      date: date.toISOString(),
      category_id,
      type: type === "income" ? "income" : "expense",
      status: "confirmed",
      exclude_from_totals: excludeFromTotals,
    })
    .eq("id", transactionId)
    .eq("household_id", householdId);

  if (error) return { error: error.message };

  if (learnRule) {
    const { normalizeMerchant } = await import("@/lib/categorize");
    const pattern = normalizeMerchant(merchantHint || description);
    if (pattern) {
      await supabase.from(dbTables.categoryRules).upsert(
        {
          household_id: householdId,
          user_id: user.id,
          pattern,
          category_id,
        },
        { onConflict: "household_id,pattern" },
      );
    }
  }

  await notifyBudgetThresholds(supabase, householdId);
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath(`/transactions/${transactionId}`);
  return { ok: true };
}

export async function deleteTransaction(transactionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const householdId = await ensureHouseholdId(supabase);

  const { error } = await supabase
    .from(dbTables.transactions)
    .delete()
    .eq("id", transactionId)
    .eq("household_id", householdId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { ok: true as const };
}

export async function dismissCardPayment(
  transactionId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const householdId = await ensureHouseholdId(supabase);

  const { error } = await supabase
    .from(dbTables.transactions)
    .update({ card_payment_dismissed: true })
    .eq("id", transactionId)
    .eq("household_id", householdId)
    .eq("card_payment", true);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function saveAvatar(
  input: Record<string, unknown>,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const householdId = await ensureHouseholdId(supabase);
  const { parseAvatar } = await import("@/lib/avatar");
  const avatar = parseAvatar(input);

  const { error } = await supabase.from(dbTables.memberAvatars).upsert(
    {
      user_id: user.id,
      household_id: householdId,
      ...avatar,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addSavingsBalance(
  amountRaw: string,
  asOfRaw: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { parseSavingsInput } = await import("@/lib/savings");
  const { todayIso } = await import("@/lib/month");
  const parsed = parseSavingsInput(amountRaw, asOfRaw, todayIso());
  if ("error" in parsed) return parsed;

  const householdId = await ensureHouseholdId(supabase);
  const { error } = await supabase.from(dbTables.savingsBalances).insert({
    household_id: householdId,
    user_id: user.id,
    amount: parsed.amount,
    as_of: parsed.asOf,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteSavingsBalance(
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const householdId = await ensureHouseholdId(supabase);
  const { error } = await supabase
    .from(dbTables.savingsBalances)
    .delete()
    .eq("id", id)
    .eq("household_id", householdId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Adiciona um nome à lista de transferências do lar e tira dos totais os
 * e-transfers já importados com esse nome.
 */
export async function addTransferName(
  rawName: string,
): Promise<{ ok: true; updated: number } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { isOwnTransfer, normalizeTransferName } = await import("@/lib/exclusions");
  const name = normalizeTransferName(rawName);
  if (name.length < 3) return { error: "Escreva pelo menos 3 letras do nome." };

  const householdId = await ensureHouseholdId(supabase);
  const { error } = await supabase
    .from(dbTables.transferNames)
    .upsert(
      { household_id: householdId, user_id: user.id, name },
      { onConflict: "household_id,name", ignoreDuplicates: true },
    );
  if (error) return { error: error.message };

  // Lançamentos já importados: e-transfers com esse nome saem dos totais.
  const { data: candidates, error: selErr } = await supabase
    .from(dbTables.transactions)
    .select("id, description")
    .eq("household_id", householdId)
    .eq("exclude_from_totals", false)
    .ilike("description", "%E-TRANSFER%");
  if (selErr) return { error: selErr.message };
  const ids = (candidates ?? [])
    .filter((t) => isOwnTransfer(String(t.description), [name]))
    .map((t) => t.id as string);
  if (ids.length > 0) {
    const { error: upErr } = await supabase
      .from(dbTables.transactions)
      .update({ exclude_from_totals: true })
      .in("id", ids)
      .eq("household_id", householdId);
    if (upErr) return { error: upErr.message };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { ok: true, updated: ids.length };
}

/** Remove um nome da lista. Lançamentos já marcados continuam como estão. */
export async function deleteTransferName(id: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const householdId = await ensureHouseholdId(supabase);
  const { error } = await supabase
    .from(dbTables.transferNames)
    .delete()
    .eq("id", id)
    .eq("household_id", householdId);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Registra este aparelho para receber notificações do lar. */
export async function savePushSubscription(
  sub: PushSubscriptionInput,
  userAgent: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };
  if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { error: "Inscrição inválida" };
  }

  const householdId = await ensureHouseholdId(supabase);
  // O mesmo aparelho pode ter se inscrito antes (outra conta ou chave antiga).
  await supabase.from(dbTables.pushSubscriptions).delete().eq("endpoint", sub.endpoint);
  const { error } = await supabase.from(dbTables.pushSubscriptions).insert({
    household_id: householdId,
    user_id: user.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    user_agent: userAgent.slice(0, 300),
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deletePushSubscription(endpoint: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };
  const householdId = await ensureHouseholdId(supabase);
  const { error } = await supabase
    .from(dbTables.pushSubscriptions)
    .delete()
    .eq("endpoint", endpoint)
    .eq("household_id", householdId);
  if (error) return { error: error.message };
  return { ok: true };
}

/** Manda uma notificação de teste para todos os aparelhos do lar. */
export async function sendTestPush(): Promise<{ ok: true; sent: number } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };
  const { isPushConfigured, sendToHousehold } = await import("@/lib/push");
  if (!isPushConfigured()) return { error: "Chaves de notificação não configuradas no servidor." };
  const householdId = await ensureHouseholdId(supabase);
  const r = await sendToHousehold(supabase, householdId, {
    title: "Notificações ligadas",
    body: "Você vai receber os avisos de limite e o lembrete de domingo.",
    url: "/dashboard",
    tag: "test",
  });
  if (r.sent === 0) return { error: "Nenhum aparelho recebeu. Ative as notificações neste celular primeiro." };
  return { ok: true, sent: r.sent };
}
