-- Nomes de pessoas do lar: e-transfers com elas não contam nos totais
-- (dinheiro passando de uma conta da casa para outra).

create table if not exists public.transfer_names_baconsfinance (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households_baconsfinance (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

alter table public.transfer_names_baconsfinance enable row level security;

drop policy if exists "transfer_names_bf_select" on public.transfer_names_baconsfinance;
drop policy if exists "transfer_names_bf_insert" on public.transfer_names_baconsfinance;
drop policy if exists "transfer_names_bf_delete" on public.transfer_names_baconsfinance;

create policy "transfer_names_bf_select"
  on public.transfer_names_baconsfinance for select
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

create policy "transfer_names_bf_insert"
  on public.transfer_names_baconsfinance for insert
  with check (
    user_id = auth.uid()
    and household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

create policy "transfer_names_bf_delete"
  on public.transfer_names_baconsfinance for delete
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

grant select, insert, delete on public.transfer_names_baconsfinance to authenticated;
