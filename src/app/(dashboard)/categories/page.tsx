import { CategoryTable } from "./CategoryTable";
import { dbTables } from "@/lib/db-tables";
import { getMyHouseholdId } from "@/lib/household-cache";
import { createClient } from "@/lib/supabase/server";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const householdId = await getMyHouseholdId();
  if (!householdId) return null;

  const { data: categories } = await supabase
    .from(dbTables.categories)
    .select("id, name, monthly_limit, target_percent")
    .eq("household_id", householdId)
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
        <p className="mt-1 text-sm text-foreground/65">
          Limites em CAD e meta percentual do total de despesas.
        </p>
      </div>
      <CategoryTable
        initial={(categories ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          monthly_limit: Number(c.monthly_limit),
          target_percent: Number(c.target_percent ?? 0),
        }))}
      />
    </div>
  );
}
