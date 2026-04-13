"use server";

import { dbTables } from "@/lib/db-tables";
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

  if (!name) return { error: "Nome obrigatório" };

  const { error } = await supabase.from(dbTables.categories).insert({
    household_id: householdId,
    user_id: user.id,
    name,
    monthly_limit,
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

  const { error } = await supabase
    .from(dbTables.transactions)
    .update({
      description,
      amount,
      date: date.toISOString(),
      category_id,
      type: type === "income" ? "income" : "expense",
    })
    .eq("id", transactionId)
    .eq("household_id", householdId);

  if (error) return { error: error.message };
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
