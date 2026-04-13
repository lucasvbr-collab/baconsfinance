import { signOut } from "@/lib/actions";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="w-full rounded-xl border border-border py-3 text-sm font-medium text-foreground/90 transition hover:bg-card"
      >
        Sair da conta
      </button>
    </form>
  );
}
