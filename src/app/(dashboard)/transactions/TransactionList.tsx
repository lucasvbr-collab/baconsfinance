import { CategoryIcon } from "@/components/CategoryIcon";
import { formatCAD } from "@/lib/format";
import { friendlyDescription } from "@/lib/friendly-description";
import Link from "next/link";

export type TransactionListRow = {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  pending: boolean;
  excluded: boolean;
  categoryName: string | null;
};

const TZ = "America/Toronto";

function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
}

function dayLabel(iso: string): string {
  const label = new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  });
  // "sexta-feira, 20 de novembro" → "Sexta-feira, 20 de novembro"
  return label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);
}

/** Extrato agrupado por dia, legível no celular e no computador. */
export function TransactionList({ rows }: { rows: TransactionListRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-3xl bg-card p-10 text-center text-sm text-foreground/55 shadow-card">
        Nenhuma transação neste período.
      </p>
    );
  }

  const groups: { key: string; label: string; rows: TransactionListRow[] }[] = [];
  for (const r of rows) {
    const key = dayKey(r.date);
    const last = groups.at(-1);
    if (last && last.key === key) last.rows.push(r);
    else groups.push({ key, label: dayLabel(r.date), rows: [r] });
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.key} aria-label={g.label}>
          <h2 className="mb-2 px-1 text-sm font-semibold text-foreground/55">{g.label}</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-3xl bg-card shadow-card">
            {g.rows.map((t) => {
              const income = t.type === "income";
              return (
                <li key={t.id}>
                  <Link
                    href={`/transactions/${t.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-background sm:px-5"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                        t.excluded
                          ? "bg-background text-foreground/40"
                          : income
                            ? "bg-success-soft text-success"
                            : "bg-accent-muted text-accent"
                      }`}
                    >
                      <CategoryIcon name={t.categoryName} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {friendlyDescription(t.description) || "Sem descrição"}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-foreground/55">
                        <span>{t.categoryName ?? "Sem categoria"}</span>
                        {t.excluded && (
                          <span className="rounded-full bg-background px-2 py-0.5 font-semibold text-foreground/60">
                            Não conta
                          </span>
                        )}
                        {t.pending && (
                          <span className="rounded-full bg-warn-soft px-2 py-0.5 font-semibold text-warn">
                            Revisar
                          </span>
                        )}
                      </span>
                    </span>
                    <span
                      className={`money shrink-0 text-sm font-bold ${
                        income ? "text-success" : t.excluded ? "text-foreground/40" : "text-foreground"
                      }`}
                    >
                      {income ? "+" : "−"}
                      {formatCAD(t.amount)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
