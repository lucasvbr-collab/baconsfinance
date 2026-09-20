import { CsvImportForm } from "./CsvImportForm";
import Link from "next/link";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Importar CSV
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          No RBC Online Banking: Accounts → Download → Accounting software / CSV.
          O ficheiro passa pela mesma categorização automática (regras + IA).
        </p>
      </div>
      <CsvImportForm />
      <Link href="/transactions" className="text-sm text-accent hover:underline">
        Voltar ao extrato
      </Link>
    </div>
  );
}
