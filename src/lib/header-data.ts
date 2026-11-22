import { parseAvatar, type AvatarConfig } from "@/lib/avatar";
import { budgetAlerts, type BudgetAlert } from "@/lib/budget-alerts";
import { pendingCardPayments, type CardPaymentRow } from "@/lib/card-payment-match";
import { dbTables } from "@/lib/db-tables";
import { formatCAD } from "@/lib/format";
import { currentYearMonth, formatYearMonth, monthRange } from "@/lib/month";
import type { SupabaseClient } from "@supabase/supabase-js";

export type HeaderNotification = {
  key: string;
  title: string;
  detail: string;
  href: string;
  tone: "danger" | "warn";
};

export type HeaderData = {
  avatar: AvatarConfig;
  hasAvatar: boolean;
  notifications: HeaderNotification[];
};

function dayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "2-digit",
    timeZone: "America/Toronto",
  });
}

export function budgetNotification(a: BudgetAlert): HeaderNotification {
  const of = `${formatCAD(a.spent)} de ${formatCAD(a.limit)}`;
  return a.level === "over"
    ? {
        key: a.key,
        title: `${a.name} estourou o limite`,
        detail: `${of}, passou ${formatCAD(a.spent - a.limit)}`,
        href: `/transactions?category_id=${a.categoryId}`,
        tone: "danger",
      }
    : {
        key: a.key,
        title: `${a.name} chegou a 100%`,
        detail: of,
        href: `/transactions?category_id=${a.categoryId}`,
        tone: "warn",
      };
}

export function cardNotification(p: CardPaymentRow): HeaderNotification {
  return {
    key: `card:${p.id}`,
    title: "Pagamento do cartão sem fatura",
    detail: `${formatCAD(p.amount)} em ${dayMonth(p.date)}. Importe a fatura para separar as compras.`,
    href: "/transactions/import",
    tone: "warn",
  };
}

/** Dados do cabeçalho: avatar de quem está logado e avisos do lar. */
export async function getHeaderData(
  supabase: SupabaseClient,
  householdId: string,
  userId: string,
): Promise<HeaderData> {
  const ym = currentYearMonth();
  const { start, end } = monthRange(ym);

  const [{ data: avatarRow }, { data: categories }, { data: expenses }, { data: cards }, { data: statements }] =
    await Promise.all([
      supabase
        .from(dbTables.memberAvatars)
        .select("style, color, accessory, background")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from(dbTables.categories)
        .select("id, name, monthly_limit, kind")
        .eq("household_id", householdId),
      supabase
        .from(dbTables.transactions)
        .select("amount, category_id")
        .eq("household_id", householdId)
        .eq("type", "expense")
        .eq("exclude_from_totals", false)
        .gte("date", start.toISOString())
        .lte("date", end.toISOString()),
      supabase
        .from(dbTables.transactions)
        .select("id, amount, date")
        .eq("household_id", householdId)
        .eq("card_payment", true)
        .eq("card_payment_dismissed", false),
      supabase
        .from(dbTables.cardStatements)
        .select("new_balance, period_end")
        .eq("household_id", householdId),
    ]);

  const spentById: Record<string, number> = {};
  for (const row of expenses ?? []) {
    const id = row.category_id as string;
    spentById[id] = (spentById[id] ?? 0) + Number(row.amount);
  }

  const budget = budgetAlerts(
    (categories ?? []).map((c) => ({
      id: c.id as string,
      name: c.name as string,
      monthlyLimit: Number(c.monthly_limit),
      kind: c.kind === "income" ? "income" : "expense",
    })),
    spentById,
    formatYearMonth(ym),
  );

  const pendingCards = pendingCardPayments(
    (cards ?? []).map((p) => ({ id: p.id as string, amount: Number(p.amount), date: p.date as string })),
    (statements ?? []).map((s) => ({ newBalance: Number(s.new_balance), periodEnd: s.period_end as string })),
  );

  return {
    avatar: parseAvatar(avatarRow),
    hasAvatar: Boolean(avatarRow),
    notifications: [...budget.map(budgetNotification), ...pendingCards.map(cardNotification)],
  };
}
