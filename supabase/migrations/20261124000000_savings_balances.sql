-- Saldo da conta savings, informado à mão (o CSV do RBC não traz saldo).
-- Uma linha por atualização; o painel mostra a mais recente e as variações.

create table if not exists public.savings_balances_baconsfinance (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households_baconsfinance (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  as_of date not null,
  created_at timestamptz not null default now()
);

create index if not exists savings_balances_bf_household_idx
  on public.savings_balances_baconsfinance (household_id, as_of);

alter table public.savings_balances_baconsfinance enable row level security;

drop policy if exists "savings_balances_bf_select" on public.savings_balances_baconsfinance;
drop policy if exists "savings_balances_bf_insert" on public.savings_balances_baconsfinance;
drop policy if exists "savings_balances_bf_delete" on public.savings_balances_baconsfinance;

create policy "savings_balances_bf_select"
  on public.savings_balances_baconsfinance for select
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

create policy "savings_balances_bf_insert"
  on public.savings_balances_baconsfinance for insert
  with check (
    user_id = auth.uid()
    and household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

-- Qualquer membro do lar pode apagar uma atualização errada.
create policy "savings_balances_bf_delete"
  on public.savings_balances_baconsfinance for delete
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

grant select, insert, delete on public.savings_balances_baconsfinance to authenticated;
