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
} as const;

/** Bucket Storage dedicado a este app */
export const storageBucketInvoices = "invoices_baconsfinance";

/** Nome da relação no select embutido (FK category_id → categories_baconsfinance) */
export const dbCategoryEmbedKey = "categories_baconsfinance" as const;
