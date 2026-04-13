-- Bacon's Finance — schema completo (lar partilhado + categorias + transações)
-- public.profiles continua a ser a do projeto partilhado (fora deste ficheiro).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Lar e membros
-- ---------------------------------------------------------------------------
create table if not exists public.households_baconsfinance (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Lar',
  created_at timestamptz not null default now()
);

create table if not exists public.household_members_baconsfinance (
  household_id uuid not null references public.households_baconsfinance (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (household_id, user_id),
  unique (user_id)
);

create index if not exists household_members_bf_household_idx
  on public.household_members_baconsfinance (household_id);

alter table public.households_baconsfinance enable row level security;
alter table public.household_members_baconsfinance enable row level security;

drop policy if exists "households_bf_select" on public.households_baconsfinance;
drop policy if exists "households_bf_insert" on public.households_baconsfinance;
drop policy if exists "household_members_bf_select" on public.household_members_baconsfinance;
drop policy if exists "household_members_bf_insert" on public.household_members_baconsfinance;
drop policy if exists "household_members_bf_delete" on public.household_members_baconsfinance;

create policy "households_bf_select"
  on public.households_baconsfinance for select
  using (
    id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

create policy "households_bf_insert"
  on public.households_baconsfinance for insert
  with check (true);

-- Não usar subconsulta à própria tabela aqui (causa recursão infinita no RLS).
create policy "household_members_bf_select"
  on public.household_members_baconsfinance for select
  using (user_id = auth.uid());

create policy "household_members_bf_insert"
  on public.household_members_baconsfinance for insert
  with check (user_id = auth.uid());

create policy "household_members_bf_delete"
  on public.household_members_baconsfinance for delete
  using (user_id = auth.uid());

create table if not exists public.household_invites_baconsfinance (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households_baconsfinance (id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

alter table public.household_invites_baconsfinance enable row level security;

drop policy if exists "household_invites_bf_insert" on public.household_invites_baconsfinance;
drop policy if exists "household_invites_bf_select" on public.household_invites_baconsfinance;
drop policy if exists "household_invites_bf_delete" on public.household_invites_baconsfinance;

create policy "household_invites_bf_insert"
  on public.household_invites_baconsfinance for insert
  with check (
    exists (
      select 1 from public.household_members_baconsfinance hm
      where hm.household_id = household_invites_baconsfinance.household_id
        and hm.user_id = auth.uid()
    )
    and created_by = auth.uid()
  );

create policy "household_invites_bf_select"
  on public.household_invites_baconsfinance for select
  using (created_by = auth.uid());

create policy "household_invites_bf_delete"
  on public.household_invites_baconsfinance for delete
  using (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Categorias e transações (por lar)
-- ---------------------------------------------------------------------------
create table if not exists public.categories_baconsfinance (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households_baconsfinance (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  monthly_limit numeric(12, 2) not null default 0,
  unique (household_id, name)
);

create index if not exists categories_baconsfinance_household_idx
  on public.categories_baconsfinance (household_id);

alter table public.categories_baconsfinance enable row level security;

drop policy if exists "categories_bf_select" on public.categories_baconsfinance;
drop policy if exists "categories_bf_insert" on public.categories_baconsfinance;
drop policy if exists "categories_bf_update" on public.categories_baconsfinance;
drop policy if exists "categories_bf_delete" on public.categories_baconsfinance;

create policy "categories_bf_select"
  on public.categories_baconsfinance for select
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

create policy "categories_bf_insert"
  on public.categories_baconsfinance for insert
  with check (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
    and user_id = auth.uid()
  );

create policy "categories_bf_update"
  on public.categories_baconsfinance for update
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

create policy "categories_bf_delete"
  on public.categories_baconsfinance for delete
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

create table if not exists public.transactions_baconsfinance (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households_baconsfinance (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  description text not null default '',
  amount numeric(12, 2) not null check (amount >= 0),
  date timestamptz not null default now(),
  category_id uuid not null references public.categories_baconsfinance (id) on delete restrict,
  type text not null check (type in ('income', 'expense'))
);

create index if not exists transactions_baconsfinance_household_date_idx
  on public.transactions_baconsfinance (household_id, date desc);

alter table public.transactions_baconsfinance enable row level security;

drop policy if exists "transactions_bf_select" on public.transactions_baconsfinance;
drop policy if exists "transactions_bf_insert" on public.transactions_baconsfinance;
drop policy if exists "transactions_bf_update" on public.transactions_baconsfinance;
drop policy if exists "transactions_bf_delete" on public.transactions_baconsfinance;

create policy "transactions_bf_select"
  on public.transactions_baconsfinance for select
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

create policy "transactions_bf_insert"
  on public.transactions_baconsfinance for insert
  with check (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
    and user_id = auth.uid()
  );

create policy "transactions_bf_update"
  on public.transactions_baconsfinance for update
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

create policy "transactions_bf_delete"
  on public.transactions_baconsfinance for delete
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

create or replace function public.accept_household_invite_bf(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inv record;
  old_hid uuid;
  mcnt int;
  new_hid uuid;
begin
  if uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into inv from public.household_invites_baconsfinance
  where token = p_token and expires_at > now()
  limit 1;

  if not found then
    return json_build_object('ok', false, 'error', 'invalid_or_expired');
  end if;

  new_hid := inv.household_id;

  if exists (
    select 1 from public.household_members_baconsfinance
    where household_id = new_hid and user_id = uid
  ) then
    delete from public.household_invites_baconsfinance where id = inv.id;
    return json_build_object('ok', true, 'message', 'already_member');
  end if;

  select household_id into old_hid
  from public.household_members_baconsfinance
  where user_id = uid
  limit 1;

  if old_hid is not null and old_hid is distinct from new_hid then
    select count(*)::int into mcnt
    from public.household_members_baconsfinance
    where household_id = old_hid;

    if mcnt > 1 then
      return json_build_object('ok', false, 'error', 'leave_shared_first');
    end if;

    update public.categories_baconsfinance set household_id = new_hid where household_id = old_hid;
    update public.transactions_baconsfinance set household_id = new_hid where household_id = old_hid;
    delete from public.household_members_baconsfinance
    where household_id = old_hid and user_id = uid;
    delete from public.households_baconsfinance h
    where h.id = old_hid
      and not exists (
        select 1 from public.household_members_baconsfinance m
        where m.household_id = h.id
      );
  end if;

  insert into public.household_members_baconsfinance (household_id, user_id)
  values (new_hid, uid);

  delete from public.household_invites_baconsfinance where id = inv.id;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.accept_household_invite_bf(text) from public;
grant execute on function public.accept_household_invite_bf(text) to authenticated;

-- Cria lar + membro sem depender de SELECT em households após INSERT (RLS).
create or replace function public.ensure_household_id_bf()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  hid uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select m.household_id into hid
  from public.household_members_baconsfinance m
  where m.user_id = uid
  limit 1;

  if found then
    return hid;
  end if;

  insert into public.households_baconsfinance (name) values ('Lar') returning id into hid;
  insert into public.household_members_baconsfinance (household_id, user_id)
  values (hid, uid);
  return hid;
exception
  when unique_violation then
    select m.household_id into hid
    from public.household_members_baconsfinance m
    where m.user_id = uid
    limit 1;
    if hid is null then
      raise;
    end if;
    return hid;
end;
$$;

revoke all on function public.ensure_household_id_bf() from public;
grant execute on function public.ensure_household_id_bf() to authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('invoices_baconsfinance', 'invoices_baconsfinance', false)
on conflict (id) do nothing;

drop policy if exists "invoices_bf_select_own" on storage.objects;
drop policy if exists "invoices_bf_insert_own" on storage.objects;
drop policy if exists "invoices_bf_update_own" on storage.objects;
drop policy if exists "invoices_bf_delete_own" on storage.objects;

create policy "invoices_bf_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'invoices_baconsfinance'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "invoices_bf_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'invoices_baconsfinance'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "invoices_bf_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'invoices_baconsfinance'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "invoices_bf_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'invoices_baconsfinance'
    and split_part(name, '/', 1) = auth.uid()::text
  );

grant select, insert, update, delete on public.households_baconsfinance to authenticated;
grant select, insert, update, delete on public.household_members_baconsfinance to authenticated;
grant select, insert, update, delete on public.household_invites_baconsfinance to authenticated;
grant select, insert, update, delete on public.categories_baconsfinance to authenticated;
grant select, insert, update, delete on public.transactions_baconsfinance to authenticated;
