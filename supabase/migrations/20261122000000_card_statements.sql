-- Faturas de cartão de crédito e marcação de pagamentos de cartão no extrato.

create table if not exists public.card_statements_baconsfinance (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households_baconsfinance (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  card_last4 text not null,
  period_start date not null,
  period_end date not null,
  previous_balance numeric(12, 2) not null,
  payments_credits numeric(12, 2) not null,
  purchases_debits numeric(12, 2) not null,
  new_balance numeric(12, 2) not null,
  due_date date,
  imported_at timestamptz not null default now(),
  unique (household_id, card_last4, period_end)
);

create index if not exists card_statements_bf_household_idx
  on public.card_statements_baconsfinance (household_id);

alter table public.card_statements_baconsfinance enable row level security;

drop policy if exists "card_statements_bf_select" on public.card_statements_baconsfinance;
drop policy if exists "card_statements_bf_insert" on public.card_statements_baconsfinance;
drop policy if exists "card_statements_bf_delete" on public.card_statements_baconsfinance;

create policy "card_statements_bf_select"
  on public.card_statements_baconsfinance for select
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

create policy "card_statements_bf_insert"
  on public.card_statements_baconsfinance for insert
  with check (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
    and user_id = auth.uid()
  );

create policy "card_statements_bf_delete"
  on public.card_statements_baconsfinance for delete
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

grant select, insert, delete on public.card_statements_baconsfinance to authenticated;

alter table public.transactions_baconsfinance
  add column if not exists card_payment boolean not null default false,
  add column if not exists card_payment_dismissed boolean not null default false,
  add column if not exists statement_id uuid
    references public.card_statements_baconsfinance (id) on delete set null;

alter table public.transactions_baconsfinance
  drop constraint if exists transactions_bf_source_check;
alter table public.transactions_baconsfinance
  add constraint transactions_bf_source_check
  check (source in ('manual', 'plaid', 'csv', 'invoice', 'card_statement'));

create index if not exists transactions_bf_card_payment_idx
  on public.transactions_baconsfinance (household_id)
  where card_payment and not card_payment_dismissed;
