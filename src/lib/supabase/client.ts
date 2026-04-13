import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!url || !key) {
    throw new Error(
      [
        "NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY vazios.",
        "Coloque ambos no ficheiro .env.local na raiz do projeto (junto ao package.json), sem aspas curvas, guarde como UTF-8 e reinicie npm run dev.",
        "Se usa duas pastas do projeto (OneDrive e outra), o servidor tem de correr na pasta onde está o .env.local.",
      ].join(" "),
    );
  }

  return createBrowserClient(url, key);
}
