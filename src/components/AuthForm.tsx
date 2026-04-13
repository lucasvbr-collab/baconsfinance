"use client";

import { friendlyAuthError } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function AuthForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");

  async function signInGoogle() {
    setLoading(true);
    setMessage(null);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
        },
      });
      if (err) setMessage(friendlyAuthError(err.message));
    } catch (e) {
      setMessage(
        friendlyAuthError(e instanceof Error ? e.message : "Erro desconhecido"),
      );
    } finally {
      setLoading(false);
    }
  }

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) setMessage(friendlyAuthError(err.message));
      else window.location.href = "/dashboard";
    } catch (e) {
      setMessage(
        friendlyAuthError(e instanceof Error ? e.message : "Erro desconhecido"),
      );
    } finally {
      setLoading(false);
    }
  }

  async function signUpEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
          data: { full_name: name },
        },
      });
      if (err) setMessage(friendlyAuthError(err.message));
      else
        setMessage(
          "Conta criada. Verifique o email para confirmar, se o projeto exigir confirmação.",
        );
    } catch (e) {
      setMessage(
        friendlyAuthError(e instanceof Error ? e.message : "Erro desconhecido"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 rounded-2xl border border-border bg-card p-8 shadow-xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bacon&apos;s Finance
        </h1>
        <p className="mt-1 text-sm text-foreground/70">
          Controle de gastos, limites por categoria e notas com IA.
        </p>
      </div>

      {(error || message) && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${error ? "bg-red-950/50 text-red-200" : "bg-amber-950/40 text-amber-100"}`}
        >
          {error === "auth"
            ? "Não foi possível concluir o login. Tente de novo."
            : message}
        </p>
      )}

      <button
        type="button"
        onClick={() => void signInGoogle()}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-50"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Entrar com Google
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-foreground/50">ou email</span>
        </div>
      </div>

      {mode === "login" ? (
        <form onSubmit={signInEmail} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/70">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/70">
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setMessage(null);
            }}
            className="text-center text-sm text-accent hover:underline"
          >
            Criar conta
          </button>
        </form>
      ) : (
        <form onSubmit={signUpEmail} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/70">
              Nome
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/70">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/70">
              Senha
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
          >
            Registrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setMessage(null);
            }}
            className="text-center text-sm text-accent hover:underline"
          >
            Já tenho conta
          </button>
        </form>
      )}
    </div>
  );
}
