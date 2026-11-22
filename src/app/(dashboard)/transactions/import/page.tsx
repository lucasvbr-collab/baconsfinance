import { CsvImportForm } from "./CsvImportForm";
import Link from "next/link";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-3xl">
          Importar extrato
        </h1>
        <div className="mt-2 space-y-2 text-sm text-foreground/65">
          <p>
            <span className="font-semibold text-foreground">Conta corrente:</span>{" "}
            no RBC Online Banking, baixe o CSV em Download transactions.
          </p>
          <p>
            <span className="font-semibold text-foreground">Cartão de crédito:</span>{" "}
            envie o PDF da fatura do RBC Mastercard. Cada compra entra separada,
            na categoria certa.
          </p>
        </div>
      </div>
      <CsvImportForm />
      <Link href="/transactions" className="text-sm text-accent hover:underline">
        Voltar ao extrato
      </Link>
    </div>
  );
}
