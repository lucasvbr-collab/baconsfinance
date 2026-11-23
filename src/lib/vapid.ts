/**
 * Chaves VAPID vindas de variável de ambiente. Ao colar no painel da Vercel é
 * fácil levar junto aspas, espaços, quebra de linha ou o "NOME=": limpa tudo.
 */
export function cleanVapidKey(raw: string | undefined | null): string {
  let v = (raw ?? "").trim();
  v = v.replace(/^[A-Z0-9_]+=/, ""); // "NEXT_PUBLIC_VAPID_PUBLIC_KEY=..."
  v = v.replace(/^["']|["']$/g, "");
  return v.replace(/\s+/g, "");
}

/** Chave pública em bytes (P-256 sem compressão: 65 bytes, começa com 0x04); inválida → null. */
export function vapidPublicKeyBytes(raw: string | undefined | null): Uint8Array<ArrayBuffer> | null {
  const key = cleanVapidKey(raw);
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(key)) return null;
  try {
    const b64 = key.replace(/=+$/, "").replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const out = new Uint8Array(new ArrayBuffer(bin.length));
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out.length === 65 && out[0] === 4 ? out : null;
  } catch {
    return null;
  }
}
