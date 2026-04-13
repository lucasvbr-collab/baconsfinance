import { dbCategoryEmbedKey } from "@/lib/db-tables";

/** Lê nome da categoria a partir da linha retornada pelo PostgREST (embed com nome da tabela FK) */
export function embedCategoryName(row: Record<string, unknown>): string | undefined {
  const embedded = row[dbCategoryEmbedKey];
  if (!embedded) return undefined;
  if (Array.isArray(embedded)) {
    const first = embedded[0];
    if (first && typeof first === "object" && "name" in first) {
      return String((first as { name: string }).name);
    }
    return undefined;
  }
  if (typeof embedded === "object" && "name" in embedded) {
    return String((embedded as { name: string }).name);
  }
  return undefined;
}
