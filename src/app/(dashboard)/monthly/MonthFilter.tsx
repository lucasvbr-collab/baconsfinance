import Link from "next/link";

export type MonthOption = { value: string; label: string };
export type Preset = { label: string; from: string; to: string; isDefault?: boolean };

const selectClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none ring-accent/40 focus:ring-2";

function presetHref(p: Preset) {
  return p.isDefault ? "/monthly" : `/monthly?from=${p.from}&to=${p.to}`;
}

/** Período da aba: atalhos + "de/até" (um mês só = mesmo mês nos dois). */
export function MonthFilter({
  from,
  to,
  custom,
  options,
  presets,
}: {
  from: string;
  to: string;
  custom: boolean;
  options: MonthOption[];
  presets: Preset[];
}) {
  // O período pedido pode começar antes do primeiro lançamento: mantém a opção na lista.
  const withSelected = (value: string) =>
    options.some((o) => o.value === value) ? options : [{ value, label: value }, ...options];

  return (
    <section aria-label="Período" className="rounded-3xl bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Atalhos de período">
        {presets.map((p) => {
          const active = p.from === from && p.to === to && (custom || p.isDefault);
          return (
            <Link
              key={p.label}
              href={presetHref(p)}
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

      <form method="get" action="/monthly" className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:items-end">
        <label className="block text-xs font-medium text-foreground/55 sm:w-48">
          De
          <select name="from" defaultValue={from} className={`mt-1.5 ${selectClass}`}>
            {withSelected(from).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-foreground/55 sm:w-48">
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
          Ver período
        </button>
        {custom && (
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
