-- Avatar de porquinho de cada membro do lar (separado de public.profiles,
-- que é compartilhada com outro app).

create table if not exists public.member_avatars_baconsfinance (
  user_id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references public.households_baconsfinance (id) on delete cascade,
  style text not null default 'masculino',
  color text not null default 'rosa',
  accessory text not null default 'nenhum',
  background text not null default 'lima',
  updated_at timestamptz not null default now(),
  constraint member_avatars_bf_style_check check (style in ('masculino', 'feminino'))
);

create index if not exists member_avatars_bf_household_idx
  on public.member_avatars_baconsfinance (household_id);

alter table public.member_avatars_baconsfinance enable row level security;

drop policy if exists "member_avatars_bf_select" on public.member_avatars_baconsfinance;
drop policy if exists "member_avatars_bf_insert" on public.member_avatars_baconsfinance;
drop policy if exists "member_avatars_bf_update" on public.member_avatars_baconsfinance;

-- Todos do lar veem os avatares do lar.
create policy "member_avatars_bf_select"
  on public.member_avatars_baconsfinance for select
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

-- Cada um cria/edita só o próprio, dentro do próprio lar.
create policy "member_avatars_bf_insert"
  on public.member_avatars_baconsfinance for insert
  with check (
    user_id = auth.uid()
    and household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

create policy "member_avatars_bf_update"
  on public.member_avatars_baconsfinance for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

grant select, insert, update on public.member_avatars_baconsfinance to authenticated;
