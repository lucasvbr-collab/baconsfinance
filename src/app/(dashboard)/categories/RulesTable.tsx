"use client";

import { deleteCategoryRule, upsertCategoryRule } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type RuleRow = {
  id: string;
  pattern: string;
  categoryName: string;
};

export function RulesTable({
  rules,
  categories,
}: {
  rules: RuleRow[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const q = filter.trim().toUpperCase();
  const visible = q
    ? rules.filter(
        (r) =>
          r.pattern.includes(q) || r.categoryName.toUpperCase().includes(q),
      )
    : rules;

  function onDelete(id: string) {
    setMsg(null);
    start(async () => {
      const r = await deleteCategoryRule(id);
      if (r && "error" in r && r.error) setMsg(r.error);
      else router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Regras automáticas
        </h2>
        <p className="mt-1 text-sm text-foreground/65">
          Se a descrição do banco contém o texto, a transação vai direto para a
          categoria, sem IA e sem revisão. Quando várias regras servem, vence o
          texto mais longo.
        </p>
      </div>

      {msg && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {msg}
        </p>
      )}

      <form
        action={(fd) => {
          const pattern = String(fd.get("pattern") ?? "");
          const categoryId = String(fd.get("category_id") ?? "");
          setMsg(null);
          start(async () => {
            const r = await upsertCategoryRule(pattern, categoryId);
            if (r && "error" in r && r.error) setMsg(r.error);
            else router.refresh();
          });
        }}
        className="flex flex-wrap items-end gap-3 rounded-3xl bg-card p-5 shadow-card"
      >
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs text-foreground/60">
            Texto na descrição
          </label>
          <input
            name="pattern"
            required
            placeholder="Ex.: PET VALU"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs text-foreground/60">
            Categoria
          </label>
          <select
            name="category_id"
            required
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
          disabled={pending || categories.length === 0}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-50"
        >
          Salvar regra
        </button>
      </form>

      {rules.length > 5 && (
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar regras…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      )}

      <div className="overflow-x-auto rounded-3xl bg-card shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-card text-xs font-semibold text-foreground/55">
            <tr>
              <th className="px-4 py-3">Texto</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((r) => (
              <tr key={r.id} className="bg-background/40">
                <td className="px-4 py-3 font-mono text-xs">{r.pattern}</td>
                <td className="px-4 py-3">{r.categoryName}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onDelete(r.id)}
                    className="rounded-lg border border-border px-2 py-1 text-xs hover:border-danger hover:text-danger disabled:opacity-50"
                  >
                    Apagar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="p-8 text-center text-sm text-foreground/55">
            {rules.length === 0
              ? "Nenhuma regra ainda. Ao editar uma transação importada, marque “Guardar regra”."
              : "Nenhuma regra com esse texto."}
          </p>
        )}
      </div>
    </section>
  );
}
