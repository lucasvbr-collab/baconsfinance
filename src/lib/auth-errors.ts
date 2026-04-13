/** Mensagem amigável quando o fetch ao Supabase falha antes da resposta HTTP */
export function friendlyAuthError(message: string): string {
  const m = message.trim();
  if (
    m === "Failed to fetch" ||
    m.includes("NetworkError") ||
    m.includes("Load failed") ||
    m.includes("Network request failed")
  ) {
    return [
      "O app não conseguiu falar com o Supabase.",
      "Confira no .env.local: NEXT_PUBLIC_SUPABASE_URL (https://xxxx.supabase.co) e NEXT_PUBLIC_SUPABASE_ANON_KEY (chave anon do painel).",
      "Salve o arquivo, pare e rode de novo npm run dev.",
      "No painel do Supabase veja se o projeto não está pausado.",
    ].join(" ");
  }
  return message;
}
