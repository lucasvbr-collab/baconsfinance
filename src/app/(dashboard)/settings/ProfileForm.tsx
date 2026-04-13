"use client";

import { updateProfileName } from "@/lib/actions";
import { useState, useTransition } from "react";

export function ProfileForm({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const [name, setName] = useState(initialName);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <div>
        <label className="mb-1 block text-xs text-foreground/60">Email</label>
        <p className="text-sm text-foreground/80">{email}</p>
      </div>
      <form
        className="space-y-3"
        action={(fd) => {
          setMsg(null);
          start(async () => {
            const n = String(fd.get("name") ?? "").trim();
            const r = await updateProfileName(n);
            if (r && "error" in r && r.error) setMsg(r.error);
            else setMsg("Nome atualizado.");
          });
        }}
      >
        <div>
          <label className="mb-1 block text-xs text-foreground/60">
            Nome do usuário
          </label>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        {msg && (
          <p
            className={`text-sm ${msg.includes("atualizado") ? "text-emerald-300" : "text-red-200"}`}
          >
            {msg}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          Salvar nome
        </button>
      </form>
    </div>
  );
}
