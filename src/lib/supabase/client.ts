import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

function publicEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
  };
}

/** Cliente browser só se URL e anon key existirem (evita crash na Vercel sem env). */
export function createBrowserClientIfConfigured(): SupabaseClient | null {
  const { url, key } = publicEnv();
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

export function createClient(): SupabaseClient {
  const client = createBrowserClientIfConfigured();
  if (!client) {
    throw new Error(
      [
        "NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY vazios.",
        "Coloque ambos no ficheiro .env.local na raiz do projeto (junto ao package.json), sem aspas curvas, guarde como UTF-8 e reinicie npm run dev.",
        "Na Vercel: Project → Settings → Environment Variables (Production e Preview).",
        "Se usa duas pastas do projeto (OneDrive e outra), o servidor tem de correr na pasta onde está o .env.local.",
      ].join(" "),
    );
  }
  return client;
}
