import { HouseholdShare } from "./HouseholdShare";
import { LogoutButton } from "./LogoutButton";
import { ProfileForm } from "./ProfileForm";
import { dbTables } from "@/lib/db-tables";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  const { data: profile } = await supabase
    .from(dbTables.profiles)
    .select("name, email")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-foreground/65">
          Dados da conta e sessão.
        </p>
      </div>
      <ProfileForm
        initialName={profile?.name ?? ""}
        email={profile?.email ?? user.email ?? ""}
      />
      <HouseholdShare baseUrl={baseUrl} />
      <LogoutButton />
    </div>
  );
}
