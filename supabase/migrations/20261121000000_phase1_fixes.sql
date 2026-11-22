-- Fase 1: status do sync, token Plaid fora do alcance do browser,
-- transações que não contam nos totais e tipo de categoria.

-- 1) Status do último sync por banco ------------------------------------------
alter table public.bank_items_baconsfinance
  add column if not exists last_sync_status text,
  add column if not exists last_sync_error text;

-- 2) Token Plaid: o browser (role authenticated) deixa de conseguir ler
--    access_token. Só o servidor com service role lê.
revoke select on public.bank_items_baconsfinance from authenticated, anon;
grant select (
  id, household_id, user_id, plaid_item_id, institution_name,
  sync_cursor, last_synced_at, created_at, last_sync_status, last_sync_error
) on public.bank_items_baconsfinance to authenticated;

-- 3) Transações que não entram nos totais (transferências, estornos NSF) ------
alter table public.transactions_baconsfinance
  add column if not exists exclude_from_totals boolean not null default false;

-- 4) Tipo de categoria (receita x despesa) ------------------------------------
alter table public.categories_baconsfinance
  add column if not exists kind text not null default 'expense';

alter table public.categories_baconsfinance
  drop constraint if exists categories_bf_kind_check;
alter table public.categories_baconsfinance
  add constraint categories_bf_kind_check check (kind in ('income', 'expense'));

-- Categorias de receita já existentes
update public.categories_baconsfinance
  set kind = 'income'
  where lower(name) in ('salário', 'salario', 'renda', 'receita', 'receitas');
