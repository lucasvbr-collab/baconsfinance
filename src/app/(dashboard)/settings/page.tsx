import { BankConnections } from "@/components/BankConnections";
import { HouseholdShare } from "./HouseholdShare";
import { LogoutButton } from "./LogoutButton";
import { ProfileForm } from "./ProfileForm";
import { dbTables } from "@/lib/db-tables";
import { getMyHouseholdId } from "@/lib/household-cache";
import { isPlaidConfigured } from "@/lib/plaid";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  const householdId = await getMyHouseholdId();

  const [{ data: profile }, { data: bankItems }] = await Promise.all([
    supabase
      .from(dbTables.profiles)
      .select("name, email")
      .eq("id", user.id)
      .maybeSingle(),
    householdId
      ? supabase
          .from(dbTables.bankItems)
          .select("id, institution_name, last_synced_at")
          .eq("household_id", householdId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-foreground/65">
          Dados da conta, bancos e sessão.
        </p>
      </div>
      <ProfileForm
        initialName={profile?.name ?? ""}
        email={profile?.email ?? user.email ?? ""}
      />
      <BankConnections
        items={bankItems ?? []}
        plaidConfigured={isPlaidConfigured()}
      />
      <section className="rounded-2xl border border-border bg-card-elevated/90 p-5 shadow-card">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Importar CSV (RBC)
        </h2>
        <p className="mt-1 text-sm text-foreground/60">
          Sem Plaid, ou como backup: exporte o CSV no RBC Online Banking e importe
          aqui.
        </p>
        <Link
          href="/transactions/import"
          className="mt-4 inline-flex rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:border-accent hover:text-accent"
        >
          Ir para importação
        </Link>
      </section>
      <HouseholdShare baseUrl={baseUrl} />
      <LogoutButton />
    </div>
  );
}
