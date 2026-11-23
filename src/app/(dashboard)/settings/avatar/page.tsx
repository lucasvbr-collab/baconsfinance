import { AvatarEditor } from "./AvatarEditor";
import { AVATAR_COLUMNS, parseAvatar } from "@/lib/avatar";
import { dbTables } from "@/lib/db-tables";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AvatarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: row } = await supabase
    .from(dbTables.memberAvatars)
    .select(AVATAR_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/settings" className="text-sm font-semibold text-accent hover:underline">
          Voltar às configurações
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight lg:text-3xl">
          Seu avatar
        </h1>
        <p className="mt-1 text-sm text-foreground/65">
          Monte o seu porquinho. Ele aparece no topo do app para você e para
          quem divide o lar com você.
        </p>
      </div>
      <AvatarEditor initial={parseAvatar(row)} />
    </div>
  );
}
