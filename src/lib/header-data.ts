import { AVATAR_COLUMNS, parseAvatar, type AvatarConfig } from "@/lib/avatar";
import { budgetAlerts, type BudgetAlert } from "@/lib/budget-alerts";
import { pendingCardPayments, type CardPaymentRow } from "@/lib/card-payment-match";
import { dbTables } from "@/lib/db-tables";
import { formatCAD } from "@/lib/format";
import { currentMonthBudget } from "@/lib/budget-notify";
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
  const [{ data: avatarRow }, budgetData, { data: cards }, { data: statements }] =
    await Promise.all([
      supabase
        .from(dbTables.memberAvatars)
        .select(AVATAR_COLUMNS)
        .eq("user_id", userId)
        .maybeSingle(),
      currentMonthBudget(supabase, householdId),
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

  const budget = budgetAlerts(budgetData.categories, budgetData.spentById, budgetData.ym);

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
