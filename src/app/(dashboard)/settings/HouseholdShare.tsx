"use client";

import { createHouseholdInvite } from "@/lib/actions";
import { useState, useTransition } from "react";

export function HouseholdShare({ baseUrl }: { baseUrl: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <h2 className="text-lg font-medium">Lar partilhado</h2>
      <p className="text-sm text-foreground/65">
        Gera um link para a outra pessoa abrir (com sessão iniciada), colar o código se precisar e aceitar. Passam a ver as mesmas categorias e transações. Convite expira em 30 dias.
      </p>
      {err && (
        <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-100">{err}</p>
      )}
      {link && (
        <div className="space-y-2">
          <p className="text-xs text-foreground/55">Envia este link:</p>
          <textarea
            readOnly
            rows={3}
            value={link}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
          />
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-2 text-sm hover:border-accent"
            onClick={() => void navigator.clipboard.writeText(link)}
          >
            Copiar link
          </button>
        </div>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setErr(null);
          setLink(null);
          start(async () => {
            const r = await createHouseholdInvite();
            if (r && "error" in r && r.error) setErr(r.error);
            else if (r && "token" in r && r.token) {
              const u = new URL("/join", baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl);
              u.searchParams.set("token", r.token);
              setLink(u.toString());
            }
          });
        }}
        className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
      >
        {pending ? "A gerar…" : "Gerar link de convite"}
      </button>
    </div>
  );
}
