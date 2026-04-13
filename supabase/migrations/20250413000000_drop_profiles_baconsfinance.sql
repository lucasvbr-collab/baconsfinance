-- Rode só se você já tinha executado a versão antiga da migration com profiles_baconsfinance.
-- Remove trigger duplicado de signup e a tabela extra (dados nessa tabela serão perdidos).

drop trigger if exists on_auth_user_created_baconsfinance on auth.users;

drop function if exists public.handle_new_user_baconsfinance();

drop table if exists public.profiles_baconsfinance cascade;
