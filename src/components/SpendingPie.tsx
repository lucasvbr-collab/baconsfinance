"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CHART_BAR_COLORS } from "@/lib/chart-colors";

type Slice = { name: string; value: number };

export function SpendingPie({ data }: { data: Slice[] }) {
  if (!data.length) {
    return (
      <p className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-foreground/60">
        Nenhum gasto por categoria neste mês.
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
            formatter={(value: number) =>
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(value)
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
