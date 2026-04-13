import { EditTransactionForm } from "./EditTransactionForm";
import { dbTables } from "@/lib/db-tables";
import { getMyHouseholdId } from "@/lib/household-cache";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const householdId = await getMyHouseholdId();
  if (!householdId) return null;

  const { data: tx, error } = await supabase
    .from(dbTables.transactions)
    .select("id, description, amount, date, category_id, type")
    .eq("id", id)
    .eq("household_id", householdId)
    .maybeSingle();

  if (error || !tx) notFound();

  const { data: categories } = await supabase
    .from(dbTables.categories)
    .select("id, name")
    .eq("household_id", householdId)
    .order("name");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/transactions" className="text-sm text-accent hover:underline">
          Voltar ao extrato
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Editar transação
        </h1>
      </div>
      <EditTransactionForm
        id={tx.id}
        categories={categories ?? []}
        initial={{
          description: tx.description,
          amount: Number(tx.amount),
          date: tx.date,
          category_id: tx.category_id,
          type: tx.type as "income" | "expense",
        }}
      />
    </div>
  );
}
