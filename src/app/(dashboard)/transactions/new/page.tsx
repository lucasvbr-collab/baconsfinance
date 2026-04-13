import { NewTransactionForm } from "./NewTransactionForm";
import { dbTables } from "@/lib/db-tables";
import { getMyHouseholdId } from "@/lib/household-cache";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const householdId = await getMyHouseholdId();
  if (!householdId) return null;

  const { data: categories } = await supabase
    .from(dbTables.categories)
    .select("id, name")
    .eq("household_id", householdId)
    .order("name");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href="/transactions"
          className="text-sm text-accent hover:underline"
        >
          Voltar ao extrato
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nova transação
        </h1>
      </div>
      <NewTransactionForm categories={categories ?? []} />
    </div>
  );
}
