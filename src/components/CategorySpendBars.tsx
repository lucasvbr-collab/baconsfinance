import { formatCAD } from "@/lib/format";
import { chartColorAt } from "@/lib/chart-colors";

type Row = {
  name: string;
  value: number;
  percentOfTotal: number;
  targetPercent: number;
};

export function CategorySpendBars({ data }: { data: Row[] }) {
  if (!data.length) {
    return (
      <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-foreground/55">
        Nenhum gasto por categoria neste período.
      </p>
    );
  }

  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <ul className="mt-5 space-y-4">
      {sorted.map((row, i) => {
        const color = chartColorAt(i);
        const overTarget =
          row.targetPercent > 0 && row.percentOfTotal > row.targetPercent;
        return (
          <li key={row.name} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium text-foreground/90">{row.name}</span>
              <span className="shrink-0 tabular-nums text-foreground/70">
                {formatCAD(row.value)}{" "}
                <span
                  className={
                    overTarget ? "text-danger" : "text-foreground/50"
                  }
                >
                  ({row.percentOfTotal.toFixed(1)}%
                  {row.targetPercent > 0
                    ? ` / meta ${row.targetPercent}%`
                    : ""}
                  )
                </span>
              </span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-border/90">
              {row.targetPercent > 0 && (
                <div
                  className="absolute inset-y-0 w-px bg-foreground/40"
                  style={{ left: `${Math.min(100, row.targetPercent)}%` }}
                  title={`Meta ${row.targetPercent}%`}
                />
              )}
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${Math.min(100, row.percentOfTotal)}%`,
                  backgroundColor: overTarget ? "var(--danger, #f87171)" : color,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
