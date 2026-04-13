-- RPC para criar lar + membro sem violar RLS no SELECT após INSERT em households.

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
