const MAX_LEN = 80;

/** Texto da busca → padrão ILIKE ("contém"), com curingas digitados neutralizados. */
export function searchPattern(raw: string | undefined | null): string | null {
  const q = (raw ?? "").trim().slice(0, MAX_LEN);
  if (!q) return null;
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
