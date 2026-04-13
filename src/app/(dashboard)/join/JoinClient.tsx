"use client";

import { acceptHouseholdInvite } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function JoinClient({ initialToken }: { initialToken: string }) {
  const router = useRouter();
  const [token, setToken] = useState(initialToken);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4 rounded-2xl border border-border bg-card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await acceptHouseholdInvite(token);
          if (r && "error" in r && r.error) setMsg(r.error);
          else {
            setMsg("Entraste no lar partilhado.");
            router.push("/dashboard");
            router.refresh();
          }
        });
      }}
    >
      {msg && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            msg.includes("Entraste") ? "bg-emerald-950/40 text-emerald-100" : "bg-red-950/50 text-red-100"
          }`}
        >
          {msg}
        </p>
      )}
      <div>
        <label className="mb-1 block text-xs text-foreground/60">
          Código do convite
        </label>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
          placeholder="Cole o código hexadecimal"
        />
      </div>
      <button
        type="submit"
        disabled={pending || !token.trim()}
        className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-black disabled:opacity-50"
      >
        Aceitar convite
      </button>
    </form>
  );
}
