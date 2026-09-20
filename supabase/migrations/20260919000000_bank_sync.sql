-- Sincronização bancária (Plaid + CSV), categorização automática e metas percentuais.

-- ---------------------------------------------------------------------------
-- Categorias: meta percentual do gasto total (0 = sem meta)
-- ---------------------------------------------------------------------------
alter table public.categories_baconsfinance
  add column if not exists target_percent numeric(5, 2) not null default 0;

-- ---------------------------------------------------------------------------
-- Transações: metadados de importação
-- ---------------------------------------------------------------------------
alter table public.transactions_baconsfinance
  add column if not exists source text not null default 'manual',
  add column if not exists status text not null default 'confirmed',
  add column if not exists merchant_name text,
  add column if not exists plaid_transaction_id text,
  add column if not exists import_hash text;

alter table public.transactions_baconsfinance
  drop constraint if exists transactions_bf_source_check;
alter table public.transactions_baconsfinance
  add constraint transactions_bf_source_check
  check (source in ('manual', 'plaid', 'csv', 'invoice'));

alter table public.transactions_baconsfinance
  drop constraint if exists transactions_bf_status_check;
alter table public.transactions_baconsfinance
  add constraint transactions_bf_status_check
  check (status in ('confirmed', 'pending_review'));

-- Dedup: id do Plaid é globalmente único; CSV usa hash por lar.
-- NULLs são distintos, então linhas manuais (sem id/hash) não conflitam.
create unique index if not exists transactions_bf_plaid_tx_uidx
  on public.transactions_baconsfinance (plaid_transaction_id);

create unique index if not exists transactions_bf_import_hash_uidx
  on public.transactions_baconsfinance (household_id, import_hash);

create index if not exists transactions_bf_status_idx
  on public.transactions_baconsfinance (household_id, status);

-- ---------------------------------------------------------------------------
-- Conexões bancárias (Plaid Items)
-- ---------------------------------------------------------------------------
create table if not exists public.bank_items_baconsfinance (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households_baconsfinance (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  plaid_item_id text not null unique,
  access_token text not null,
  institution_name text not null default '',
  sync_cursor text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists bank_items_bf_household_idx
  on public.bank_items_baconsfinance (household_id);

alter table public.bank_items_baconsfinance enable row level security;

drop policy if exists "bank_items_bf_select" on public.bank_items_baconsfinance;
drop policy if exists "bank_items_bf_insert" on public.bank_items_baconsfinance;
drop policy if exists "bank_items_bf_update" on public.bank_items_baconsfinance;
drop policy if exists "bank_items_bf_delete" on public.bank_items_baconsfinance;

create policy "bank_items_bf_select"
  on public.bank_items_baconsfinance for select
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

create policy "bank_items_bf_insert"
  on public.bank_items_baconsfinance for insert
  with check (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
    and user_id = auth.uid()
  );

create policy "bank_items_bf_update"
  on public.bank_items_baconsfinance for update
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

create policy "bank_items_bf_delete"
  on public.bank_items_baconsfinance for delete
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Contas bancárias (por Item)
-- ---------------------------------------------------------------------------
create table if not exists public.bank_accounts_baconsfinance (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.bank_items_baconsfinance (id) on delete cascade,
  household_id uuid not null references public.households_baconsfinance (id) on delete cascade,
  plaid_account_id text not null unique,
  name text not null default '',
  mask text,
  subtype text,
  created_at timestamptz not null default now()
);

create index if not exists bank_accounts_bf_household_idx
  on public.bank_accounts_baconsfinance (household_id);

alter table public.bank_accounts_baconsfinance enable row level security;

drop policy if exists "bank_accounts_bf_select" on public.bank_accounts_baconsfinance;
drop policy if exists "bank_accounts_bf_insert" on public.bank_accounts_baconsfinance;
drop policy if exists "bank_accounts_bf_update" on public.bank_accounts_baconsfinance;
drop policy if exists "bank_accounts_bf_delete" on public.bank_accounts_baconsfinance;

create policy "bank_accounts_bf_select"
  on public.bank_accounts_baconsfinance for select
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

create policy "bank_accounts_bf_insert"
  on public.bank_accounts_baconsfinance for insert
  with check (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

create policy "bank_accounts_bf_update"
  on public.bank_accounts_baconsfinance for update
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

create policy "bank_accounts_bf_delete"
  on public.bank_accounts_baconsfinance for delete
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Regras de categorização (comerciante → categoria)
-- ---------------------------------------------------------------------------
create table if not exists public.category_rules_baconsfinance (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households_baconsfinance (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  pattern text not null,
  category_id uuid not null references public.categories_baconsfinance (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (household_id, pattern)
);

create index if not exists category_rules_bf_household_idx
  on public.category_rules_baconsfinance (household_id);

alter table public.category_rules_baconsfinance enable row level security;

drop policy if exists "category_rules_bf_select" on public.category_rules_baconsfinance;
drop policy if exists "category_rules_bf_insert" on public.category_rules_baconsfinance;
drop policy if exists "category_rules_bf_update" on public.category_rules_baconsfinance;
drop policy if exists "category_rules_bf_delete" on public.category_rules_baconsfinance;

create policy "category_rules_bf_select"
  on public.category_rules_baconsfinance for select
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

create policy "category_rules_bf_insert"
  on public.category_rules_baconsfinance for insert
  with check (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
    and user_id = auth.uid()
  );

create policy "category_rules_bf_update"
  on public.category_rules_baconsfinance for update
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

create policy "category_rules_bf_delete"
  on public.category_rules_baconsfinance for delete
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.bank_items_baconsfinance to authenticated;
grant select, insert, update, delete on public.bank_accounts_baconsfinance to authenticated;
grant select, insert, update, delete on public.category_rules_baconsfinance to authenticated;
