import Link from "next/link";

export type MonthOption = { value: string; label: string };
export type Preset = { label: string; from: string; to: string; isDefault?: boolean };
export type CategoryOption = { id: string; name: string; kind: "income" | "expense" };

const selectClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none ring-accent/40 focus:ring-2";

function monthlyHref(params: { from?: string; to?: string; category?: string | null }) {
  const q = new URLSearchParams();
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  if (params.category) q.set("category", params.category);
  const s = q.toString();
  return s ? `/monthly?${s}` : "/monthly";
}

/** Período e categoria da aba: atalhos + "de/até" (um mês só = mesmo mês nos dois). */
export function MonthFilter({
  from,
  to,
  custom,
  options,
  presets,
  categories,
  categoryId,
}: {
  from: string;
  to: string;
  custom: boolean;
  options: MonthOption[];
  presets: Preset[];
  categories: CategoryOption[];
  categoryId: string | null;
}) {
  // O período pedido pode começar antes do primeiro lançamento: mantém a opção na lista.
  const withSelected = (value: string) =>
    options.some((o) => o.value === value) ? options : [{ value, label: value }, ...options];
  const incomeCats = categories.filter((c) => c.kind === "income");
  const expenseCats = categories.filter((c) => c.kind === "expense");

  return (
    <section aria-label="Período e categoria" className="rounded-3xl bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Atalhos de período">
        {presets.map((p) => {
          const active = p.from === from && p.to === to && (custom || p.isDefault);
          return (
            <Link
              key={p.label}
              href={monthlyHref(p.isDefault ? { category: categoryId } : { from: p.from, to: p.to, category: categoryId })}
              aria-current={active ? "true" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-accent text-on-accent"
                  : "bg-background text-foreground/70 hover:text-foreground"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>

      <form method="get" action="/monthly" className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
        <label className="col-span-2 block text-xs font-medium text-foreground/55 sm:w-56">
          Categoria
          <select name="category" defaultValue={categoryId ?? ""} className={`mt-1.5 ${selectClass}`}>
            <option value="">Todas (entrou, saiu e sobrou)</option>
            {incomeCats.length > 0 && (
              <optgroup label="Entradas">
                {incomeCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            )}
            {expenseCats.length > 0 && (
              <optgroup label="Gastos">
                {expenseCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        <label className="block text-xs font-medium text-foreground/55 sm:w-44">
          De
          <select name="from" defaultValue={from} className={`mt-1.5 ${selectClass}`}>
            {withSelected(from).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-foreground/55 sm:w-44">
          Até
          <select name="to" defaultValue={to} className={`mt-1.5 ${selectClass}`}>
            {withSelected(to).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="col-span-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent transition hover:brightness-110"
        >
          Ver
        </button>
        {(custom || categoryId) && (
          <Link
            href="/monthly"
            className="col-span-2 text-center text-sm font-semibold text-accent hover:underline sm:self-center"
          >
            Limpar
          </Link>
        )}
      </form>
      <p className="mt-3 text-xs text-foreground/50">Para ver um mês só, escolha o mesmo mês em “De” e “Até”.</p>
    </section>
  );
}
