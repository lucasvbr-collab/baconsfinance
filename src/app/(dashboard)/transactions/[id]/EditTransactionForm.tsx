"use client";

import { deleteTransaction, updateTransaction } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function EditTransactionForm({
  id,
  categories,
  initial,
}: {
  id: string;
  categories: { id: string; name: string }[];
  initial: {
    description: string;
    amount: number;
    date: string;
    category_id: string;
    type: "income" | "expense";
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [type, setType] = useState<"expense" | "income">(initial.type);

  const dateStr = initial.date.slice(0, 10);

  return (
    <div className="space-y-4">
      {err && (
        <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-100">
          {err}
        </p>
      )}
      <form
        className="space-y-4 rounded-2xl border border-border bg-card p-6"
        action={(fd) => {
          fd.set("type", type);
          setErr(null);
          start(async () => {
            const r = await updateTransaction(id, fd);
            if (r && "error" in r && r.error) setErr(r.error);
            else router.refresh();
          });
        }}
      >

        <div>
          <label className="mb-1 block text-xs text-foreground/60">Tipo</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                type === "expense"
                  ? "border-accent bg-accent text-black"
                  : "border-border"
              }`}
            >
              Saída
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                type === "income"
                  ? "border-emerald-500 bg-emerald-600/30 text-emerald-100"
                  : "border-border"
              }`}
            >
              Entrada
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-foreground/60">
            Descrição
          </label>
          <input
            name="description"
            required
            defaultValue={initial.description}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-foreground/60">Valor (R$)</label>
          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            defaultValue={initial.amount}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-foreground/60">Data</label>
          <input
            name="date"
            type="date"
            required
            defaultValue={dateStr}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-foreground/60">Categoria</label>
          <select
            name="category_id"
            required
            defaultValue={initial.category_id}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-black disabled:opacity-50"
        >
          Salvar alterações
        </button>
      </form>

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Excluir esta transação?")) return;
          setErr(null);
          start(async () => {
            const r = await deleteTransaction(id);
            if (r && "error" in r && r.error) setErr(r.error);
            else router.push("/transactions");
          });
        }}
        className="w-full rounded-xl border border-red-900/60 py-3 text-sm font-medium text-red-200 hover:bg-red-950/30 disabled:opacity-50"
      >
        Excluir transação
      </button>
    </div>
  );
}
