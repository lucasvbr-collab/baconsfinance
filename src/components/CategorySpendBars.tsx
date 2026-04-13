import { formatBRL } from "@/lib/format";
import { chartColorAt } from "@/lib/chart-colors";

type Row = { name: string; value: number };

export function CategorySpendBars({ data }: { data: Row[] }) {
  if (!data.length) {
    return (
      <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-foreground/55">
        Nenhum gasto por categoria neste mês.
      </p>
    );
  }

  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((d) => d.value), 1);

  return (
    <ul className="mt-5 space-y-4">
      {sorted.map((row, i) => {
        const pct = (row.value / max) * 100;
        const color = chartColorAt(i);
        return (
          <li key={row.name} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium text-foreground/90">{row.name}</span>
              <span className="shrink-0 tabular-nums text-foreground/70">
                {formatBRL(row.value)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-border/90">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
