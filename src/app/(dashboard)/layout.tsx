import { AppNav } from "@/components/AppNav";
import { TopBar } from "@/components/TopBar";
import { getHeaderData } from "@/lib/header-data";
import { getMyHouseholdId } from "@/lib/household-cache";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const householdId = await getMyHouseholdId();
  const header = householdId
    ? await getHeaderData(supabase, householdId, user.id)
    : null;

  return (
    <div className="min-h-screen lg:flex">
      <AppNav />
      <div className="min-w-0 flex-1">
        {header && (
          <TopBar
            avatar={header.avatar}
            hasAvatar={header.hasAvatar}
            notifications={header.notifications}
          />
        )}
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-4">
          {children}
        </main>
      </div>
    </div>
  );
}
