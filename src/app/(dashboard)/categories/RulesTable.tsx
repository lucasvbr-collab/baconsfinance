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
        className="grid gap-3 rounded-3xl bg-card p-5 shadow-card sm:flex sm:flex-wrap sm:items-end"
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

      {visible.length === 0 ? (
        <p className="rounded-3xl bg-card p-8 text-center text-sm text-foreground/55 shadow-card">
          {rules.length === 0
            ? "Nenhuma regra ainda. Ao editar uma transação importada, marque “Guardar regra”."
            : "Nenhuma regra com esse texto."}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-3xl bg-card shadow-card">
          {visible.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-5 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-xs">{r.pattern}</span>
                <span className="mt-0.5 block text-sm font-semibold">{r.categoryName}</span>
              </span>
              <button
                type="button"
                disabled={pending}
                aria-label={`Apagar regra ${r.pattern}`}
                onClick={() => onDelete(r.id)}
                className="shrink-0 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:border-danger hover:text-danger disabled:opacity-50"
              >
                Apagar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
