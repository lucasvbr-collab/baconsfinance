import { CardPaymentAlerts } from "@/components/CardPaymentAlerts";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Icon } from "@/components/Icon";
import { InvoiceUpload } from "@/components/InvoiceUpload";
import { SavingsCard } from "@/components/SavingsCard";
import type { CardPaymentRow } from "@/lib/card-payment-match";
import { formatCAD } from "@/lib/format";
import { friendlyDescription } from "@/lib/friendly-description";
import type { SavingsSummary } from "@/lib/savings";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

export type PeriodLink = { key: string; label: string; href: string; active: boolean };

export type SpendSlice = { id: string; name: string; value: number; color: string };

export type BudgetRow = {
  id: string;
  name: string;
  spent: number;
  limit: number;
  target: number;
  share: number;
  overLimit: boolean;
  nearLimit: boolean;
  atLimit: boolean;
  overTarget: boolean;
  color: string;
};

export type RecentRow = {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  categoryName: string | null;
};

export type DashboardViewProps = {
  periodLabel: string;
  periodLinks: PeriodLink[];
  prevHref: string;
  nextHref: string | null;
  inPeriod: string;
  totals: { income: number; expense: number; net: number };
  ranked: SpendSlice[];
  totalExpense: number;
  activeRows: BudgetRow[];
  idleNames: string[];
  recent: RecentRow[];
  categories: { id: string; name: string }[];
  pendingCards: CardPaymentRow[];
  savings: SavingsSummary | null;
  /** Hoje (YYYY-MM-DD) no fuso do app */
  today: string;
};

const pct = (value: number, total: number) => ((value / total) * 100).toFixed(0);

export function DashboardView(p: DashboardViewProps) {
  const { totals, totalExpense, inPeriod } = p;
  const net = totals.net;
  const hasData = totals.income > 0 || totals.expense > 0;

  return (
    <div className="space-y-6 lg:space-y-8">
      <h1 className="font-display text-2xl font-bold tracking-tight lg:text-3xl">Painel</h1>

      <CardPaymentAlerts payments={p.pendingCards} />

      {/* Cartão do mês */}
      <section
        aria-label={`Resumo de ${p.periodLabel}`}
        className="rounded-[28px] bg-plum p-5 text-white shadow-plum sm:p-8"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-1 sm:justify-start">
            <Link
              href={p.prevHref}
              aria-label="Mês anterior"
              className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <Icon name="chevronLeft" />
            </Link>
            <span className="min-w-0 text-center text-sm font-semibold text-white/90 sm:min-w-[8.5rem]">
              {p.periodLabel.charAt(0).toLocaleUpperCase("pt-BR") + p.periodLabel.slice(1)}
            </span>
            {p.nextHref ? (
              <Link
                href={p.nextHref}
                aria-label="Próximo mês"
                className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <Icon name="chevronRight" />
              </Link>
            ) : (
              <span className="p-1.5 text-white/20" aria-hidden>
                <Icon name="chevronRight" />
              </span>
            )}
          </div>
          <div
            className="grid grid-cols-4 rounded-full bg-white/10 p-1 sm:flex"
            role="group"
            aria-label="Período"
          >
            {p.periodLinks.map((l) => (
              <Link
                key={l.key}
                href={l.href}
                aria-current={l.active ? "true" : undefined}
                className={`rounded-full px-2 py-1.5 text-center text-xs font-semibold transition sm:px-3 sm:py-1 ${
                  l.active ? "bg-lime text-plum" : "text-white/70 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-7 sm:mt-10">
          <p className="text-sm font-medium text-white/65">
            {net >= 0 ? `Sobrou ${inPeriod}` : `Faltou ${inPeriod}`}
          </p>
          <p
            className={`money mt-1 break-words font-display text-[2.75rem] font-bold leading-none tracking-tight sm:text-7xl ${
              net >= 0 ? "text-lime" : "text-[#ff9db5]"
            }`}
          >
            {formatCAD(Math.abs(net))}
          </p>
          <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div className="flex items-baseline gap-2">
              <dt className="text-white/60">Entrou</dt>
              <dd className="money font-semibold text-[#7ee8b5]">+{formatCAD(totals.income)}</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="text-white/60">Saiu</dt>
              <dd className="money font-semibold text-white">−{formatCAD(totals.expense)}</dd>
            </div>
          </dl>
        </div>

        {totalExpense > 0 ? (
          <div className="mt-7 sm:mt-8">
            <p className="text-sm font-medium text-white/65">Para onde foi</p>
            <div
              className="bf-stripe mt-3 flex h-3.5 gap-[3px] overflow-hidden rounded-full"
              role="img"
              aria-label={p.ranked.map((r) => `${r.name} ${pct(r.value, totalExpense)}%`).join(", ")}
            >
              {p.ranked.map((r) => (
                <span
                  key={r.id}
                  className="h-full min-w-[3px] first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${(r.value / totalExpense) * 100}%`,
                    backgroundColor: r.color,
                  }}
                />
              ))}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2 text-sm sm:grid-cols-3 sm:gap-x-6">
              {p.ranked.slice(0, 6).map((r) => (
                <li key={r.id} className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: r.color }}
                    aria-hidden
                  />
                  <span className="truncate text-white/80">{r.name}</span>
                  <span className="money ml-auto shrink-0 font-semibold">
                    {pct(r.value, totalExpense)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-8 text-sm text-white/65">Nenhuma saída {inPeriod}.</p>
        )}
      </section>

      <SavingsCard summary={p.savings} today={p.today} />

      {!hasData && (
        <div className="flex flex-col items-start gap-3 rounded-3xl border border-dashed border-accent/40 bg-accent-muted p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-sm text-foreground/80">
            Ainda não há lançamentos {inPeriod}. Importe o CSV do RBC para preencher o painel.
          </p>
          <Link
            href="/transactions/import"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent"
          >
            <Icon name="upload" className="h-4 w-4" />
            Importar extrato
          </Link>
        </div>
      )}

      {/* minmax(0, …): uma descrição longa não pode alargar a página no celular */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-8">
        <section className="min-w-0 rounded-3xl bg-card p-5 shadow-card sm:p-6">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl font-bold tracking-tight">Categorias</h2>
            <Link href="/categories" className="shrink-0 text-sm font-semibold text-accent hover:underline">
              Ajustar limites
            </Link>
          </div>

          <ul className="mt-5 space-y-5">
            {p.activeRows.map((r) => (
              <BudgetItem key={r.id} row={r} />
            ))}
            {p.activeRows.length === 0 && (
              <li className="text-sm text-foreground/60">
                Nenhum gasto {inPeriod}.{" "}
                <Link href="/categories" className="font-semibold text-accent underline">
                  Criar ou ajustar categorias
                </Link>
              </li>
            )}
          </ul>

          {p.idleNames.length > 0 && p.activeRows.length > 0 && (
            <p className="mt-6 border-t border-border pt-4 text-xs text-foreground/50">
              Sem gastos {inPeriod}: {p.idleNames.join(", ")}.
            </p>
          )}
        </section>

        <div className="min-w-0 space-y-6 lg:space-y-8">
          <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-xl font-bold tracking-tight">Últimos lançamentos</h2>
              <Link href="/transactions" className="shrink-0 text-sm font-semibold text-accent hover:underline">
                Ver extrato
              </Link>
            </div>
            <ul className="mt-4 divide-y divide-border">
              {p.recent.map((t) => {
                const income = t.type === "income";
                return (
                  <li key={t.id}>
                    <Link
                      href={`/transactions/${t.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-background"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
                          income ? "bg-success-soft text-success" : "bg-accent-muted text-accent"
                        }`}
                        aria-hidden
                      >
                        <CategoryIcon name={t.categoryName} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {friendlyDescription(t.description) || "Sem descrição"}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-foreground/55">
                          {t.categoryName ?? "Sem categoria"},{" "}
                          {format(new Date(t.date), "d 'de' MMM", { locale: ptBR })}
                        </span>
                      </span>
                      <span
                        className={`money shrink-0 text-sm font-bold ${income ? "text-success" : "text-foreground"}`}
                      >
                        {income ? "+" : "−"}
                        {formatCAD(t.amount)}
                      </span>
                    </Link>
                  </li>
                );
              })}
              {p.recent.length === 0 && (
                <li className="py-8 text-center text-sm text-foreground/55">Nenhum lançamento {inPeriod}.</li>
              )}
            </ul>
          </section>

          <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
            <h2 className="font-display text-xl font-bold tracking-tight">Adicionar lançamentos</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link
                href="/transactions/import"
                className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-on-accent transition hover:brightness-110"
              >
                <Icon name="upload" className="h-4 w-4" />
                Importar extrato
              </Link>
              <Link
                href="/transactions/new"
                className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold transition hover:border-accent hover:text-accent"
              >
                <Icon name="plus" className="h-4 w-4" />
                Lançar à mão
              </Link>
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <InvoiceUpload categories={p.categories} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/** % do limite usado. Abaixo do limite arredonda para baixo: 99,6% não vira "100%". */
function limitPercent(r: BudgetRow): number {
  if (r.atLimit) return 100;
  const pct = (r.spent / r.limit) * 100;
  return r.overLimit ? Math.max(101, Math.round(pct)) : Math.floor(pct);
}

function BudgetItem({ row: r }: { row: BudgetRow }) {
  const barPct = r.limit > 0 ? Math.min(100, (r.spent / r.limit) * 100) : Math.min(100, r.share);
  const barColor = r.overLimit ? "var(--danger)" : r.nearLimit || r.atLimit ? "var(--warn)" : r.color;
  return (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="flex min-w-0 items-center gap-2 font-semibold">
          <CategoryIcon name={r.name} className="h-[18px] w-[18px] shrink-0 text-foreground/55" />
          <span className="truncate">{r.name}</span>
        </span>
        <span className="money ml-auto text-sm font-semibold">
          {formatCAD(r.spent)}
          {r.limit > 0 && <span className="font-medium text-foreground/45"> de {formatCAD(r.limit)}</span>}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
        <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: barColor }} />
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-3 text-xs text-foreground/55">
        <p className="min-w-0">
          {r.share.toFixed(1)}% das saídas
          {r.target > 0 && (
            <span className={r.overTarget ? "font-semibold text-danger" : ""}>
              {", "}meta {r.target}%
            </span>
          )}
          {r.overLimit && (
            <span className="font-semibold text-danger">
              {", "}passou {formatCAD(r.spent - r.limit)} do limite
            </span>
          )}
          {r.atLimit && <span className="font-semibold text-warn">{", "}no limite</span>}
        </p>
        {r.limit > 0 && (
          <p
            className={`money shrink-0 font-semibold ${
              r.overLimit ? "text-danger" : r.nearLimit || r.atLimit ? "text-warn" : "text-foreground/65"
            }`}
          >
            {limitPercent(r)}% do limite
          </p>
        )}
      </div>
    </li>
  );
}
