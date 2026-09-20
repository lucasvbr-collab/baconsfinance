"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CHART_BAR_COLORS } from "@/lib/chart-colors";

type Slice = { name: string; value: number; percentOfTotal?: number };

export function SpendingPie({ data }: { data: Slice[] }) {
  if (!data.length) {
    return (
      <p className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-foreground/60">
        Nenhum gasto por categoria neste período.
      </p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={56}
            outerRadius={100}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={CHART_BAR_COLORS[i % CHART_BAR_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, _name, item) => {
              const pct = (item?.payload as Slice | undefined)?.percentOfTotal;
              const money = new Intl.NumberFormat("en-CA", {
                style: "currency",
                currency: "CAD",
              }).format(value);
              return pct != null
                ? [`${money} (${pct.toFixed(1)}%)`, ""]
                : [money, ""];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
