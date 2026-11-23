-- Notificações no celular (Web Push): inscrições dos aparelhos, avisos de
-- limite já enviados (80/90/100% por categoria e mês) e registro de importações
-- (o lembrete semanal olha a última).

create table if not exists public.push_subscriptions_baconsfinance (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households_baconsfinance (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_bf_household_idx
  on public.push_subscriptions_baconsfinance (household_id);

create table if not exists public.budget_notices_baconsfinance (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households_baconsfinance (id) on delete cascade,
  category_id uuid not null references public.categories_baconsfinance (id) on delete cascade,
  ym text not null check (ym ~ '^\d{4}-\d{2}$'),
  threshold int not null check (threshold in (80, 90, 100)),
  created_at timestamptz not null default now(),
  unique (household_id, category_id, ym, threshold)
);

create table if not exists public.import_log_baconsfinance (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households_baconsfinance (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null,
  inserted int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists import_log_bf_household_idx
  on public.import_log_baconsfinance (household_id, created_at desc);

alter table public.push_subscriptions_baconsfinance enable row level security;
alter table public.budget_notices_baconsfinance enable row level security;
alter table public.import_log_baconsfinance enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'push_subscriptions_baconsfinance',
    'budget_notices_baconsfinance',
    'import_log_baconsfinance'
  ] loop
    execute format('drop policy if exists "%s_select" on public.%I', t, t);
    execute format('drop policy if exists "%s_insert" on public.%I', t, t);
    execute format(
      'create policy "%s_select" on public.%I for select using (
         household_id in (select household_id from public.household_members_baconsfinance where user_id = auth.uid())
       )', t, t);
    execute format(
      'create policy "%s_insert" on public.%I for insert with check (
         household_id in (select household_id from public.household_members_baconsfinance where user_id = auth.uid())
       )', t, t);
  end loop;
end $$;

-- Inscrição: cada um grava/apaga as do próprio usuário. As de outros membros
-- podem ser apagadas quando o serviço de push diz que expiraram (404/410).
drop policy if exists "push_subscriptions_baconsfinance_delete" on public.push_subscriptions_baconsfinance;
create policy "push_subscriptions_baconsfinance_delete"
  on public.push_subscriptions_baconsfinance for delete
  using (
    household_id in (
      select household_id from public.household_members_baconsfinance
      where user_id = auth.uid()
    )
  );

grant select, insert, delete on public.push_subscriptions_baconsfinance to authenticated;
grant select, insert on public.budget_notices_baconsfinance to authenticated;
grant select, insert on public.import_log_baconsfinance to authenticated;
