-- Avatar por espaços: um item por parte do corpo, para poder combinar
-- (ex.: laço + brincos + colar). A coluna antiga "accessory" vira o espaço certo.

alter table public.member_avatars_baconsfinance
  add column if not exists head text not null default 'nenhum',
  add column if not exists hair text not null default 'nenhum',
  add column if not exists face text not null default 'nenhum',
  add column if not exists makeup text not null default 'nenhum',
  add column if not exists ears text not null default 'nenhum',
  add column if not exists neck text not null default 'nenhum';

update public.member_avatars_baconsfinance
  set head = accessory
  where accessory in ('laco', 'bone', 'coroa') and head = 'nenhum';

update public.member_avatars_baconsfinance
  set face = accessory
  where accessory = 'oculos' and face = 'nenhum';

update public.member_avatars_baconsfinance
  set neck = accessory
  where accessory = 'gravata' and neck = 'nenhum';

-- "accessory" fica só por compatibilidade; o app não lê mais.
comment on column public.member_avatars_baconsfinance.accessory is
  'Obsoleta: substituída por head/hair/face/makeup/ears/neck (2026-11-22).';
