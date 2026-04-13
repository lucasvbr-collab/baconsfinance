import { JoinClient } from "./JoinClient";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Entrar no lar partilhado</h1>
        <p className="mt-1 text-sm text-foreground/65">
          Cola o código do convite que a outra pessoa gerou em Configurações. Precisas de sessão iniciada nesta conta.
        </p>
      </div>
      <JoinClient initialToken={token ?? ""} />
    </div>
  );
}
