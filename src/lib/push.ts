// Só servidor: usa a chave privada VAPID.
import { dbTables } from "@/lib/db-tables";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanVapidKey } from "@/lib/vapid";
import webpush from "web-push";

export type PushPayload = {
  title: string;
  body: string;
  /** Página aberta ao tocar na notificação. */
  url: string;
  /** Notificações com a mesma tag se substituem no celular. */
  tag?: string;
};

let configured: boolean | null = null;

/** Configura o web-push com as chaves VAPID; sem elas, o envio é ignorado. */
export function isPushConfigured(): boolean {
  if (configured !== null) return configured;
  const pub = cleanVapidKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const priv = cleanVapidKey(process.env.VAPID_PRIVATE_KEY);
  const subject = cleanVapidKey(process.env.VAPID_SUBJECT) || "mailto:bacons-finance@example.com";
  if (!pub || !priv) return (configured = false);
  try {
    webpush.setVapidDetails(subject, pub, priv);
  } catch (e) {
    console.error("[push] chaves VAPID inválidas:", e instanceof Error ? e.message : e);
    return (configured = false);
  }
  return (configured = true);
}

/**
 * Manda para todos os aparelhos do lar. Inscrições que o serviço diz que
 * expiraram (404/410) são apagadas. Nunca lança: falha de push não pode
 * quebrar uma importação.
 */
export async function sendToHousehold(
  supabase: SupabaseClient,
  householdId: string,
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  if (!isPushConfigured()) return { sent: 0, removed: 0 };
  const { data: subs, error } = await supabase
    .from(dbTables.pushSubscriptions)
    .select("id, endpoint, p256dh, auth")
    .eq("household_id", householdId);
  if (error || !subs?.length) return { sent: 0, removed: 0 };

  const body = JSON.stringify(payload);
  const expired: string[] = [];
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } },
          body,
          { TTL: 60 * 60 * 24 },
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) expired.push(s.id as string);
        else console.error(`[push] falha ao enviar (${status ?? "?"}):`, e instanceof Error ? e.message : e);
      }
    }),
  );
  if (expired.length > 0) {
    await supabase.from(dbTables.pushSubscriptions).delete().in("id", expired);
  }
  return { sent, removed: expired.length };
}
