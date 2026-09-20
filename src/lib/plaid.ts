import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

/**
 * Cliente Plaid (server-side).
 * Env: PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV (sandbox | production).
 * O plano Trial gratuito do Plaid usa o ambiente production.
 */
export function getPlaidClient(): PlaidApi {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) {
    throw new Error(
      "PLAID_CLIENT_ID e PLAID_SECRET não configurados no servidor.",
    );
  }
  const env = process.env.PLAID_ENV === "sandbox" ? "sandbox" : "production";
  const configuration = new Configuration({
    basePath: PlaidEnvironments[env],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });
  return new PlaidApi(configuration);
}

export function isPlaidConfigured(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}
