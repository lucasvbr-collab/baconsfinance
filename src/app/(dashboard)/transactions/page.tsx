import { dbCategoryEmbedKey, dbTables } from "@/lib/db-tables";
import { getMyHouseholdId } from "@/lib/household-cache";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";
import { embedCategoryName } from "@/lib/supabase-joins";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

type Search = { from?: string; to?: string; category_id?: string };

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const householdId = await getMyHouseholdId();
  if (!householdId) return null;

  const now = new Date();
  const defaultFrom = format(startOfMonth(now), "yyyy-MM-dd");
  const defaultTo = format(endOfMonth(now), "yyyy-MM-dd");
  const from = sp.from ?? defaultFrom;
  const to = sp.to ?? defaultTo;

  const fromIso = new Date(`${from}T00:00:00`).toISOString();
  const toIso = new Date(`${to}T23:59:59.999`).toISOString();

  const { data: categories } = await supabase
    .from(dbTables.categories)
    .select("id, name")
    .eq("household_id", householdId)
    .order("name");

  const rawCategory = sp.category_id?.trim() ?? "";
  const categoryFilter =
    rawCategory &&
    isUuid(rawCategory) &&
    (categories ?? []).some((c) => c.id === rawCategory)
      ? rawCategory
      : undefined;

  let txQuery = supabase
    .from(dbTables.transactions)
    .select(`id, description, amount, date, type, ${dbCategoryEmbedKey}(name)`)
    .eq("household_id", householdId)
    .gte("date", fromIso)
    .lte("date", toIso)
    .order("date", { ascending: false });

  if (categoryFilter) {
    txQuery = txQuery.eq("category_id", categoryFilter);
  }

  const { data: rows } = await txQuery;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Extrato
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          Entradas e saídas no período selecionado.
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-card-elevated/90 p-5 shadow-card"
        method="get"
      >
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground/55">
            De
          </label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none ring-accent/40 focus:ring-2"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground/55">
            Até
          </label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none ring-accent/40 focus:ring-2"
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1.5 block text-xs font-medium text-foreground/55">
            Categoria
          </label>
          <select
            name="category_id"
            defaultValue={categoryFilter ?? ""}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none ring-accent/40 focus:ring-2"
          >
            <option value="">Todas</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
        >
          Filtrar
        </button>
        <Link
          href="/transactions/new"
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition hover:border-accent hover:text-accent"
        >
          Nova transação
        </Link>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-card-elevated/90 shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-card/80 text-xs font-medium uppercase tracking-wide text-foreground/50">
              <tr>
                <th className="px-5 py-3.5">Data</th>
                <th className="px-5 py-3.5">Descrição</th>
                <th className="px-5 py-3.5">Categoria</th>
                <th className="px-5 py-3.5 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {(rows ?? []).map((t) => {
                const catName = embedCategoryName(
                  t as unknown as Record<string, unknown>,
                );
                const sign = t.type === "income" ? "+" : "−";
                return (
                  <tr key={t.id} className="transition hover:bg-card/50">
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <Link
                        href={`/transactions/${t.id}`}
                        className="text-accent hover:underline"
                      >
                        {format(new Date(t.date), "dd/MM/yyyy", { locale: ptBR })}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/transactions/${t.id}`}
                        className="font-medium hover:text-accent"
                      >
                        {t.description || "—"}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-foreground/65">
                      {catName ?? "—"}
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right font-display font-semibold tabular-nums ${
                        t.type === "income" ? "text-success" : "text-danger"
                      }`}
                    >
                      {sign} {formatBRL(Number(t.amount))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(rows ?? []).length === 0 && (
          <p className="p-10 text-center text-sm text-foreground/55">
            Nenhuma transação neste período.
          </p>
        )}
      </div>
    </div>
  );
}
