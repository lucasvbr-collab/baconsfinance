import { dbTables } from "@/lib/db-tables";
import { reminderFor, reminderMessage } from "@/lib/import-reminder";
import { isPushConfigured, sendToHousehold } from "@/lib/push";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * Cron diário (Vercel, GET com Authorization: Bearer CRON_SECRET): a partir do
 * domingo, lembra cada lar de subir os gastos da semana até alguém importar.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada (o lembrete precisa ler todos os lares)." },
      { status: 500 },
    );
  }
  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Chaves VAPID não configuradas." }, { status: 500 });
  }

  const admin = createAdminClient();
  const { data: subs, error } = await admin.from(dbTables.pushSubscriptions).select("household_id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const households = [...new Set((subs ?? []).map((s) => s.household_id as string))];
  const now = new Date();
  const results: { household: string; daysLate: number | null; sent: number }[] = [];

  for (const householdId of households) {
    const { data: last } = await admin
      .from(dbTables.importLog)
      .select("created_at")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const reminder = reminderFor(last?.created_at ? new Date(last.created_at as string) : null, now);
    if (!reminder) {
      results.push({ household: householdId, daysLate: null, sent: 0 });
      continue;
    }
    const r = await sendToHousehold(admin, householdId, {
      ...reminderMessage(reminder.daysLate),
      url: "/transactions/import",
      tag: "weekly-import",
    });
    results.push({ household: householdId, daysLate: reminder.daysLate, sent: r.sent });
  }

  return NextResponse.json({ households: results.length, results });
}
