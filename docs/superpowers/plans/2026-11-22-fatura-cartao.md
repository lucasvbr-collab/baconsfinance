# Fatura do cartão — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detectar pagamentos de cartão no extrato, avisar no painel até a fatura entrar, e importar o PDF da fatura RBC Mastercard quebrando as compras nas categorias.

**Architecture:** Funções puras e testadas em `src/lib/` (detecção de pagamento, leitor do texto da fatura, ligação pagamento↔fatura); a importação reaproveita `importTransactions` (regras → IA → fallback). O PDF vira texto no servidor com `unpdf`; o texto é interpretado por regex do layout RBC e conferido contra o resumo da própria fatura antes de gravar.

**Tech Stack:** Next.js 15 (App Router, server actions), Supabase (Postgres + RLS), Vitest, `unpdf`.

**Spec:** `docs/superpowers/specs/2026-11-22-fatura-cartao-design.md`

## Global Constraints

- Nunca gravar fatura parcial: conferência falhou → nada é gravado.
- Pagamento de cartão nunca entra nos totais (`exclude_from_totals = true`).
- `VISA DEBIT` nunca é pagamento de cartão.
- Do PDF, só os últimos 4 dígitos do cartão vão para o banco (sem nome, endereço, número completo).
- Fixture de teste: texto da fatura **sanitizado** (nome, endereço, número do cartão trocados por placeholders; últimos 4 = `1256` podem ficar).
- Datas de compra no fuso `America/Toronto`, gravadas como `YYYY-MM-DDT12:00:00` local → ISO (mesma convenção de `src/lib/rbc-csv.ts`).
- SQL de migração: arquivo em `supabase/migrations/` + aplicado via `DATABASE_URL` do `.env.local` (script `pg` do scratchpad; nunca imprimir `.env.local`).
- Versão do `unpdf` fixada exata (sem `^`), publicada há mais de 2 semanas.
- Copy da UI em pt-BR, frases simples, sem maiúsculas em rótulos.

## Review Focus

- Mesma fatura enviada duas vezes → "Essa fatura já foi importada." e nada duplicado (Task 4).
- PDF que não é fatura RBC Mastercard (ex.: extrato da conta) → "Não reconheci uma fatura do RBC Mastercard neste PDF." (Task 3).
- Fatura que atravessa o ano (DEC→JAN) → compras de dezembro no ano anterior (Task 3).
- Valores com milhar (`$1,234.56`) e créditos negativos (`-$12.00`) lidos corretamente (Task 3).
- Pagamento parcial/manual sem fatura com mesmo valor → resolvido pela fatura cujo período terminou até 40 dias antes (Task 5).

---

### Task 1: Migração, categoria Transporte e regras

**Files:**
- Create: `supabase/migrations/20261122000000_card_statements.sql`
- Create: `scripts/out/fatura-rodar-no-supabase.sql` (migração + seed do lar; sem comentário na 1ª linha)
- Modify: `src/lib/db-tables.ts` (adicionar `cardStatements: "card_statements_baconsfinance"`)

**Interfaces:**
- Produces (DB): `transactions_baconsfinance.card_payment boolean not null default false`, `.card_payment_dismissed boolean not null default false`, `.statement_id uuid null references card_statements_baconsfinance(id) on delete set null`; check `transactions_bf_source_check` passa a aceitar `'card_statement'`.
- Produces (DB): `card_statements_baconsfinance(id uuid pk, household_id uuid, user_id uuid, card_last4 text, period_start date, period_end date, previous_balance numeric(12,2), payments_credits numeric(12,2), purchases_debits numeric(12,2), new_balance numeric(12,2), due_date date null, imported_at timestamptz default now())`, `unique (household_id, card_last4, period_end)`, RLS select/insert/delete por membro do lar (mesmo padrão de `category_rules_baconsfinance`), `grant select, insert, delete to authenticated`.
- Produces (dados do lar `540be4e2-…`): categoria `Transporte` (kind expense); regras (padrão → categoria): `UBER`→Transporte, `UBER EATS`→Lazer, `UBERTRIP`→Transporte, `OPENAI`→Assinaturas, `ANTHROPIC`→Assinaturas, `DISNEY PLUS`→Assinaturas, `GLOBO`→Assinaturas, `CANVA`→Assinaturas, `YOUTUBE`→Assinaturas, `DOORDASHDASHPASS`→Assinaturas, `DOORDASH`→Lazer, `STARBUCKS`→Lazer, `BURGER KING`→Lazer, `MAPLE CORPORATION`→Saúde, `AMZN MKTP`→Extra.

- [ ] **Step 1:** Escrever a migração e o script combinado (migração + `insert … on conflict do nothing` da categoria + `insert … on conflict (household_id, pattern) do update` das regras + `select` final das regras novas).
- [ ] **Step 2:** Aplicar via `DATABASE_URL`. Expected: sem erro; select lista 15 regras; `select count(*) from card_statements_baconsfinance` = 0; `has_column_privilege('authenticated','public.transactions_baconsfinance','card_payment','UPDATE')` = true.
- [ ] **Step 3:** `npx tsc --noEmit` passa.
- [ ] **Step 4: Commit** `feat(db): tabela de faturas, flags de pagamento de cartão e categoria Transporte`

### Task 2: Detectar pagamento de cartão no extrato

**Files:**
- Create: `src/lib/card-payment.ts`, `src/lib/card-payment.test.ts`
- Modify: `src/lib/import-transactions.ts` (marcar `card_payment` e `exclude_from_totals`; contar em `ImportResult.cardPayments`)
- Modify: `src/app/(dashboard)/transactions/import/CsvImportForm.tsx` (mensagem)

**Interfaces:**
- Produces: `isCardPayment(description: string, type: "income" | "expense"): boolean`
- Produces: `ImportResult` ganha `cardPayments: number`.

- [ ] **Step 1: Testes** em `card-payment.test.ts`:
  - `isCardPayment("ONLINE BANKING PAYMENT - 1234 RBC MASTERCARD", "expense")` → true
  - `isCardPayment("MASTERCARD PAYMENT", "expense")` → true
  - `isCardPayment("PAYMENT - VISA", "expense")` → true
  - `isCardPayment("VISA DEBIT PURCHASE - 1234 COSTCO", "expense")` → false
  - `isCardPayment("E-TRANSFER SENT BRITISH SQUARE", "expense")` → false
  - `isCardPayment("ONLINE BANKING PAYMENT - 8517 SAAQ-REGISTRATI", "expense")` → false
  - `isCardPayment("MASTERCARD REFUND", "income")` → false
- [ ] **Step 2:** `npx vitest run src/lib/card-payment.test.ts` → FAIL (módulo não existe).
- [ ] **Step 3:** Implementar com regex `/MASTERCARD|MASTER CARD|\bVISA\b|CREDIT CARD|CARTE DE CR/i`, rejeitando `/VISA DEBIT/i` e `type !== "expense"`.
- [ ] **Step 4:** Integrar em `importTransactions`: transação que `isCardPayment` → `exclude: true`, `status: "confirmed"`, categoria fallback, coluna `card_payment: true` no insert; `cardPayments` no retorno. Mensagem do CSV acrescenta, se > 0: `"{n} pagamento(s) de cartão encontrado(s). Importe a fatura para separar as compras."`
- [ ] **Step 5:** `npx vitest run` → tudo PASS; `npx tsc --noEmit` ok.
- [ ] **Step 6: Commit** `feat: detecta pagamento de cartão no extrato e tira dos totais`

### Task 3: Leitor do texto da fatura RBC

**Files:**
- Create: `src/lib/rbc-card-statement.ts`, `src/lib/rbc-card-statement.test.ts`
- Create: `src/lib/__fixtures__/rbc-mastercard-2026-11.txt` (sanitizado)
- Modify: `package.json` (dependência `unpdf`, versão exata)

**Interfaces:**
- Produces:
  ```ts
  export type CardStatementLine = { date: string /* YYYY-MM-DD, data da transação */; description: string; amount: number /* >0 compra, <0 crédito */; isPayment: boolean };
  export type CardStatement = { cardLast4: string; periodStart: string; periodEnd: string; dueDate: string | null; previousBalance: number; paymentsCredits: number /* negativo, como na fatura */; purchasesDebits: number; cashAdvances: number; interest: number; fees: number; newBalance: number; lines: CardStatementLine[] };
  export class CardStatementError extends Error {}
  export function parseRbcCardStatementText(text: string): CardStatement; // lança CardStatementError
  export async function extractPdfText(data: Uint8Array): Promise<string>; // unpdf, páginas unidas por "\n"
  ```

- [ ] **Step 1:** Instalar `unpdf` (versão exata). Gerar o fixture: rodar `extractPdfText` no PDF `C:/Users/lucas/Downloads/5415901252011256_2026_10_06_2026_11_03.pdf` via script no scratchpad, salvar o texto, trocar nome/endereço por `TITULAR EXEMPLO` / `ENDERECO EXEMPLO` e `5415 90** **** 1256` por `0000 00** **** 1256`. Conferir que o fixture não contém `LUCAS`, `SYMMES`, `5415`.
- [ ] **Step 2: Testes** com o fixture:
  - `periodStart` `"2026-10-06"`, `periodEnd` `"2026-11-03"`, `dueDate` `"2026-11-24"`, `cardLast4` `"1256"`, `newBalance` `331.43`, `previousBalance` `568.09`, `purchasesDebits` `513.00`, `paymentsCredits` `-749.66`
  - `lines.filter(l => !l.isPayment)` tem 20 itens, soma `513.00`
  - 2 linhas `isPayment` com `-534.48` e `-215.18`
  - primeira compra: `{ date: "2026-10-06", description: "PTCENTERPAG LEIRIA 10", amount: 25.17 }` (linha "Foreign Currency…" e referência numérica não entram na descrição)
  - última: `{ date: "2026-11-02", description: "BURGER KING #8818 OTTAWA ON", amount: 19.77 }`
  - remover a linha do Starbucks de `$7.63` do texto → lança `CardStatementError` com mensagem contendo `"505.37"` e `"513.00"`
  - texto de outro documento (ex.: `"RBC Royal Bank chequing statement"`) → `CardStatementError("Não reconheci uma fatura do RBC Mastercard neste PDF.")`
  - virada de ano: período `DEC 06 TO JAN 05, 2027` com linha `DEC 20 DEC 21 X $10.00` → data `"2026-12-20"`
  - valor `$1,234.56` → `1234.56`; crédito `-$12.00` não-pagamento → `amount -12`, `isPayment false`
- [ ] **Step 3:** `npx vitest run src/lib/rbc-card-statement.test.ts` → FAIL.
- [ ] **Step 4:** Implementar. Algoritmo de conferência (mensagem exata):
  ```
  compras = soma(lines.amount > 0); creditos = soma(lines.amount < 0)
  esperado_compras = purchasesDebits + cashAdvances + interest + fees
  |compras - esperado_compras| > 0.01 → throw CardStatementError(`Li ${fmt(compras)} em compras, mas a fatura diz ${fmt(esperado_compras)}. Nada foi importado.`)
  |creditos - paymentsCredits| > 0.01 → mesma forma, com "créditos"
  |previousBalance + compras + creditos - newBalance| > 0.01 → throw "O saldo da fatura não fecha. Nada foi importado."
  ```
  `fmt` = `formatCAD`. Ano da linha: ano de `periodEnd`, menos 1 se mês da linha > mês de `periodEnd`. Pagamento = descrição começa com `PAYMENT - THANK YOU`.
- [ ] **Step 5:** `npx vitest run` → PASS.
- [ ] **Step 6: Commit** `feat: leitor da fatura RBC Mastercard com conferência dos totais`

### Task 4: Importar a fatura pelo app

**Files:**
- Create: `src/app/(dashboard)/transactions/import/card-actions.ts`
- Modify: `src/lib/import-transactions.ts` (`source` aceita `"card_statement"`; `IncomingTransaction.statementId?: string` gravado em `statement_id`)
- Modify: `src/app/(dashboard)/transactions/import/CsvImportForm.tsx` e `page.tsx` (aceitar `.csv,.pdf`; PDF vai para a nova action)

**Interfaces:**
- Consumes: `extractPdfText`, `parseRbcCardStatementText`, `CardStatementError` (Task 3); `importTransactions` (Task 2).
- Produces: `importCardStatementAction(formData: FormData): Promise<{ error: string } | { ok: true; inserted: number; skipped: number; pendingReview: number; period: string; newBalance: number }>`

- [ ] **Step 1:** Implementar a action: validar arquivo (`.pdf`, ≤ 5 MB) → texto → parse → `insert` em `card_statements` (só campos do resumo + `card_last4`); erro `23505` → `{ error: "Essa fatura já foi importada." }` → compras (`amount > 0`, `type: "expense"`) e créditos não-pagamento (`type: "income"`, sempre `pending_review`) viram `IncomingTransaction` com `source: "card_statement"`, `statementId`, `importHash = sha256("card|"+date+"|"+abs.toFixed(2)+"|"+description+"|"+type)`; pagamentos ignorados → `importTransactions` → `revalidatePath("/dashboard")`, `("/transactions")`. Se `importTransactions` lançar, apagar a linha da fatura recém-criada.
- [ ] **Step 2:** Formulário: um único campo de arquivo `accept=".csv,.pdf"`; PDF chama `importCardStatementAction`. Mensagem de sucesso: `"Fatura de {período} importada: {inserted} compras ({pendingReview} para revisar)."`. Texto da página explica: "CSV do extrato da conta ou PDF da fatura do RBC Mastercard."
- [ ] **Step 3:** Verificação manual com o banco real: subir o PDF da fatura no app (`npm run dev`) → 20 lançamentos `card_statement`; Uber em Transporte; `select sum(amount) … where statement_id = …` = `513.00`; subir de novo → "Essa fatura já foi importada."
- [ ] **Step 4:** `npx tsc --noEmit`, `npm run lint`, `npx vitest run` passam.
- [ ] **Step 5: Commit** `feat: importa PDF da fatura do cartão`

### Task 5: Aviso de pagamento sem fatura

**Files:**
- Create: `src/lib/card-payment-match.ts`, `src/lib/card-payment-match.test.ts`
- Create: `src/components/CardPaymentAlerts.tsx`
- Modify: `src/lib/actions.ts` (`dismissCardPayment`)
- Modify: `src/app/(dashboard)/dashboard/page.tsx` (buscar pagamentos e faturas; renderizar alertas acima do cartão do mês)

**Interfaces:**
- Produces:
  ```ts
  export type CardPaymentRow = { id: string; amount: number; date: string /* ISO */ };
  export type StatementRow = { newBalance: number; periodEnd: string /* YYYY-MM-DD */ };
  export function pendingCardPayments(payments: CardPaymentRow[], statements: StatementRow[]): CardPaymentRow[];
  export async function dismissCardPayment(transactionId: string): Promise<{ ok: true } | { error: string }>;
  ```

- [ ] **Step 1: Testes** de `pendingCardPayments`:
  - pagamento `331.43` em `2026-11-24` + fatura `newBalance 331.43` → resolvido (lista vazia)
  - pagamento `331.42` (diferença 0,01) → resolvido
  - pagamento `534.48` em `2026-10-05` + fatura com `periodEnd 2026-09-05`, valor diferente → resolvido (≤ 40 dias)
  - mesmo pagamento + fatura com `periodEnd 2026-08-01` → pendente
  - sem faturas → todos pendentes, ordenados do mais recente
- [ ] **Step 2:** `npx vitest run src/lib/card-payment-match.test.ts` → FAIL; implementar; → PASS.
- [ ] **Step 3:** `dismissCardPayment`: update `card_payment_dismissed = true` filtrando por `id` e `household_id`; `revalidatePath("/dashboard")`.
- [ ] **Step 4:** Painel: buscar `card_payment = true and card_payment_dismissed = false` (todas as datas) e as faturas do lar; `CardPaymentAlerts` mostra uma faixa por pendente, estilo `bg-warn-soft text-foreground rounded-3xl`, texto exato `"Pagamento do cartão de {formatCAD(amount)} em {d/MM} ainda sem fatura."` com link "Importar fatura" (`/transactions/import`) e botão "Dispensar".
- [ ] **Step 5:** `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `next build` passam.
- [ ] **Step 6: Commit** `feat: aviso no painel para pagamento de cartão sem fatura`
