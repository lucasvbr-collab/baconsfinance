import { getPlaidClient, isPlaidConfigured } from "@/lib/plaid";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";

export async function POST() {
  try {
    if (!isPlaidConfigured()) {
      return NextResponse.json(
        { error: "Plaid não configurado (PLAID_CLIENT_ID / PLAID_SECRET)." },
        { status: 500 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const plaid = getPlaidClient();
    const redirectUri = process.env.PLAID_REDIRECT_URI;

    const { data } = await plaid.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "Bacon's Finance",
      products: [Products.Transactions],
      country_codes: [CountryCode.Ca],
      language: "en",
      transactions: { days_requested: 730 },
      ...(redirectUri ? { redirect_uri: redirectUri } : {}),
    });

    return NextResponse.json({ link_token: data.link_token });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
