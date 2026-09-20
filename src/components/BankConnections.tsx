"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useRouter } from "next/navigation";

export type BankItemSummary = {
  id: string;
  institution_name: string;
  last_synced_at: string | null;
};

export function BankConnections({
  items: initialItems,
  plaidConfigured,
}: {
  items: BankItemSummary[];
  plaidConfigured: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const fetchLinkToken = useCallback(async () => {
    setMsg(null);
    const res = await fetch("/api/plaid/create-link-token", { method: "POST" });
    const data = (await res.json()) as { link_token?: string; error?: string };
    if (!res.ok || !data.link_token) {
      setMsg(data.error ?? "Falha ao criar link token");
      return;
    }
    setLinkToken(data.link_token);
  }, []);

  const onSuccess = useCallback(
    async (
      publicToken: string | null,
      metadata: { institution?: { name?: string } | null },
    ) => {
      if (!publicToken) {
        setMsg("Token Plaid em falta");
        return;
      }
      setBusy(true);
      setMsg(null);
      try {
        const res = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_token: publicToken,
            institution_name: metadata.institution?.name ?? "Banco",
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setMsg(data.error ?? "Falha ao conectar banco");
          return;
        }
        setLinkToken(null);
        setMsg("Banco conectado. Sincronizando…");
        const syncRes = await fetch("/api/plaid/sync", { method: "POST" });
        const syncData = (await syncRes.json()) as {
          error?: string;
          totals?: { inserted: number; pendingReview: number };
        };
        if (!syncRes.ok) {
          setMsg(syncData.error ?? "Conectado, mas a sincronização falhou.");
        } else {
          const t = syncData.totals;
          setMsg(
            t
              ? `Sincronizado: ${t.inserted} novas (${t.pendingReview} para revisão).`
              : "Sincronização concluída.",
          );
        }
        router.refresh();
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  async function syncNow() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/plaid/sync", { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        totals?: { inserted: number; skipped: number; pendingReview: number };
        errors?: { institution: string; error: string }[];
      };
      if (!res.ok) {
        setMsg(data.error ?? "Falha na sincronização");
        return;
      }
      const t = data.totals;
      const errHint =
        data.errors && data.errors.length > 0
          ? ` Erros: ${data.errors.map((e) => e.institution).join(", ")}.`
          : "";
      setMsg(
        t
          ? `Sincronizado: ${t.inserted} novas, ${t.skipped} já existentes, ${t.pendingReview} para revisão.${errHint}`
          : `Sincronização concluída.${errHint}`,
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function disconnect(itemId: string) {
    if (!window.confirm("Desconectar este banco? As transações já importadas permanecem.")) {
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/plaid/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Falha ao desconectar");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      setMsg("Banco desconectado.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card-elevated/90 p-5 shadow-card">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Contas bancárias
        </h2>
        <p className="mt-1 text-sm text-foreground/60">
          Conecte o RBC (ou outro banco) via Plaid para importar gastos automaticamente.
        </p>
      </div>

      {!plaidConfigured && (
        <p className="rounded-lg bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
          Plaid não configurado. Defina PLAID_CLIENT_ID e PLAID_SECRET no ambiente.
        </p>
      )}

      {msg && (
        <p className="rounded-lg bg-card px-3 py-2 text-sm text-foreground/80">{msg}</p>
      )}

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-4 py-3"
          >
            <div>
              <p className="font-medium">{item.institution_name || "Banco"}</p>
              <p className="text-xs text-foreground/55">
                {item.last_synced_at
                  ? `Última sync: ${new Date(item.last_synced_at).toLocaleString("pt-BR")}`
                  : "Ainda não sincronizado"}
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void disconnect(item.id)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:border-danger hover:text-danger disabled:opacity-50"
            >
              Desconectar
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-foreground/55">Nenhum banco conectado.</li>
        )}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !plaidConfigured}
          onClick={() => void fetchLinkToken()}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
        >
          Conectar banco
        </button>
        {items.length > 0 && (
          <button
            type="button"
            disabled={busy || !plaidConfigured}
            onClick={() => void syncNow()}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:border-accent hover:text-accent disabled:opacity-50"
          >
            Sincronizar agora
          </button>
        )}
      </div>
    </section>
  );
}
