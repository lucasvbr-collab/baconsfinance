/**
 * Tabelas no Postgres.
 * profiles: partilhada com outro app.
 * Finanças: por lar (household); vários auth.users no mesmo lar veem os mesmos dados.
 */
export const dbTables = {
  profiles: "profiles",
  households: "households_baconsfinance",
  householdMembers: "household_members_baconsfinance",
  householdInvites: "household_invites_baconsfinance",
  categories: "categories_baconsfinance",
  transactions: "transactions_baconsfinance",
  bankItems: "bank_items_baconsfinance",
  bankAccounts: "bank_accounts_baconsfinance",
  categoryRules: "category_rules_baconsfinance",
  memberAvatars: "member_avatars_baconsfinance",
  cardStatements: "card_statements_baconsfinance",
  savingsBalances: "savings_balances_baconsfinance",
  transferNames: "transfer_names_baconsfinance",
  pushSubscriptions: "push_subscriptions_baconsfinance",
  budgetNotices: "budget_notices_baconsfinance",
  importLog: "import_log_baconsfinance",
} as const;

/** Bucket Storage dedicado a este app */
export const storageBucketInvoices = "invoices_baconsfinance";

/** Nome da relação no select embutido (FK category_id → categories_baconsfinance) */
export const dbCategoryEmbedKey = "categories_baconsfinance" as const;
