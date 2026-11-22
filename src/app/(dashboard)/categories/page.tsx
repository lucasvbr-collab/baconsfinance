import { CategoryTable } from "./CategoryTable";
import { RulesTable } from "./RulesTable";
import { dbCategoryEmbedKey, dbTables } from "@/lib/db-tables";
import { embedCategoryName } from "@/lib/supabase-joins";
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

  const [{ data: categories }, { data: rules }] = await Promise.all([
    supabase
      .from(dbTables.categories)
      .select("id, name, monthly_limit, target_percent, kind")
      .eq("household_id", householdId)
      .order("name"),
    supabase
      .from(dbTables.categoryRules)
      .select(`id, pattern, ${dbCategoryEmbedKey}(name)`)
      .eq("household_id", householdId)
      .order("pattern"),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-3xl">Categorias</h1>
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
          kind: c.kind === "income" ? "income" : "expense",
        }))}
      />
      <RulesTable
        categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name }))}
        rules={(rules ?? []).map((r) => ({
          id: r.id,
          pattern: r.pattern,
          categoryName:
            embedCategoryName(r as unknown as Record<string, unknown>) ?? "—",
        }))}
      />
    </div>
  );
}
