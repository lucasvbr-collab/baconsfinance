"use client";

import { storageBucketInvoices } from "@/lib/db-tables";
import { createClient } from "@/lib/supabase/client";
import { insertTransaction } from "@/lib/actions";
import { formatBRL } from "@/lib/format";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Category = { id: string; name: string };

type Parsed = {
  amount: number;
  date: string;
  description: string;
  suggestedCategoryName?: string;
};

export function InvoiceUpload({ categories }: { categories: Category[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<Parsed | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");

  function matchSuggestedCategory(p: Parsed) {
    if (!p.suggestedCategoryName) return;
    const s = p.suggestedCategoryName.toLowerCase();
    const found = categories.find((c) => c.name.toLowerCase() === s);
    if (found) setCategoryId(found.id);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErr(null);
    setPreview(null);
    setBusy(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setErr("Sessão expirada.");
      return;
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(storageBucketInvoices)
      .upload(path, file, { upsert: false });

    if (upErr) {
      setBusy(false);
      setErr(upErr.message);
      return;
    }

    const res = await fetch("/api/invoice-parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });

    const json = (await res.json()) as Parsed & { error?: string };

    if (!res.ok) {
      setBusy(false);
      setErr(json.error ?? "Falha ao processar nota");
      return;
    }

    setPreview(json);
    setAmount(String(json.amount));
    setDate(json.date.slice(0, 10));
    setDescription(json.description);
    setCategoryId("");
    matchSuggestedCategory(json);
    setBusy(false);
  }

  async function saveFromPreview() {
    if (!preview) return;
    setErr(null);
    setBusy(true);

    const amt = Number.parseFloat(amount.replace(",", "."));
    if (!categoryId) {
      setErr("Selecione uma categoria.");
      setBusy(false);
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr("Valor inválido.");
      setBusy(false);
      return;
    }

    const iso = date
      ? new Date(`${date}T12:00:00`).toISOString()
      : new Date().toISOString();

    const result = await insertTransaction({
      description,
      amount: amt,
      date: iso,
      category_id: categoryId,
      type: "expense",
    });

    if ("error" in result && result.error) {
      setErr(result.error);
      setBusy(false);
      return;
    }

    setPreview(null);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:border-accent hover:text-accent">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          disabled={busy || categories.length === 0}
          onChange={(ev) => void onFile(ev)}
        />
        {busy ? "Processando…" : "Upload de nota fiscal (IA)"}
      </label>

      {categories.length === 0 && (
        <p className="text-xs text-amber-200/90">
          Crie ao menos uma categoria antes de usar a leitura por IA.
        </p>
      )}

      {err && (
        <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-100">
          {err}
        </p>
      )}

      {preview && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground/90">
            Confirme os dados antes de salvar
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-foreground/60">
                Descrição
              </label>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-foreground/60">
                Valor (R$)
              </label>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-foreground/60">
                Data
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-foreground/60">
                Categoria
              </label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveFromPreview()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              Salvar transação
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setPreview(null);
                setErr(null);
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground/80"
            >
              Cancelar
            </button>
          </div>
          <p className="text-xs text-foreground/50">
            Sugestão do modelo: {formatBRL(preview.amount)} em{" "}
            {preview.suggestedCategoryName ?? "—"}
          </p>
        </div>
      )}
    </div>
  );
}
