# Saldo da savings — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Card "Guardado na savings" no painel, com saldo informado à mão e histórico.

**Architecture:** Tabela `savings_balances_baconsfinance` (uma linha por atualização). Funções puras em `src/lib/savings.ts` (validação de entrada + resumo). Server actions em `src/lib/actions.ts`. Card client em `src/components/SavingsCard.tsx`, dados lidos em `dashboard/page.tsx`.

**Tech Stack:** Next.js 15 (app router, server actions), Supabase (RLS), Vitest, Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-22-saldo-savings-design.md`

## Global Constraints

- Sem commits (pedido do Lucas): parar antes de `git commit`.
- Textos em português; valores com `formatCAD`; entrada com `parseMoneyInput`.
- Dados por lar (`household_id`), RLS igual às outras tabelas do lar.
- Não mexer nos totais de receita/despesa.

## Review Focus

- Valor com vírgula decimal ("1.234,56") ou "$12,450.00": deve virar o número certo.
- Data no futuro ou inválida: recusar com mensagem.
- Duas atualizações no mesmo dia: a mais recente (created_at) vale.
- Última atualização de um ano anterior: "no ano" não aparece.
- Apagar a única atualização: card volta ao estado vazio.

---

### Task 1: Funções puras

**Files:** Create `src/lib/savings.ts`, Test `src/lib/savings.test.ts`

**Interfaces — Produces:**
- `type SavingsEntry = { id: string; amount: number; asOf: string /* YYYY-MM-DD */; createdAt: string }`
- `type SavingsSummary = { latest: SavingsEntry; sinceLast: number | null; sinceYearStart: number | null }`
- `summarizeSavings(entries: SavingsEntry[], todayIso: string): SavingsSummary | null` — ordena por `asOf`, depois `createdAt`; `sinceLast` = último − anterior; `sinceYearStart` = último − primeiro do ano de `todayIso` (null se o último é de outro ano ou é o único do ano).
- `parseSavingsInput(amountRaw: string, asOfRaw: string, todayIso: string): { amount: number; asOf: string } | { error: string }`

- [ ] Testes: vazio → null; uma entrada → deltas null; ordem fora de ordem; mesmo dia desempate por createdAt; ano anterior → sinceYearStart null; input "1.234,56" → 1234.56; data futura/ inválida/ valor negativo → error.
- [ ] Rodar `npx vitest run src/lib/savings.test.ts` → FAIL; implementar; → PASS.

### Task 2: Banco + actions

**Files:** Create `supabase/migrations/20261124000000_savings_balances.sql`; Modify `src/lib/db-tables.ts`, `src/lib/actions.ts`

- Tabela: `id uuid pk`, `household_id` fk, `user_id` fk auth.users, `amount numeric(12,2) check >= 0`, `as_of date not null`, `created_at timestamptz default now()`; índice `(household_id, as_of)`; policies select/insert/delete para membros do lar.
- `addSavingsBalance(amountRaw: string, asOfRaw: string): Promise<{ ok: true } | { error: string }>`
- `deleteSavingsBalance(id: string): Promise<{ ok: true } | { error: string }>`
- [ ] Aplicar a migration via `DATABASE_URL` (script pg no scratchpad).

### Task 3: Card no painel

**Files:** Create `src/components/SavingsCard.tsx`; Modify `dashboard/page.tsx`, `DashboardView.tsx`

- Props: `{ summary: SavingsSummary | null; todayIso: string }`. Mostra valor, "atualizado em d/MM", deltas, form inline (valor + data) e "Apagar última".
- Logo abaixo dos avisos de cartão, antes do cartão do mês? Não: depois do cartão do mês, para não roubar o destaque do "sobrou".
- [ ] `npx tsc --noEmit`, `npx vitest run`, `npm run lint`, `npm run build`.
