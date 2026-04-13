-- Correr no SQL Editor do Supabase (uma vez) se aparecer "infinite recursion" em household_members.

drop policy if exists "household_members_bf_select" on public.household_members_baconsfinance;

create policy "household_members_bf_select"
  on public.household_members_baconsfinance for select
  using (user_id = auth.uid());
