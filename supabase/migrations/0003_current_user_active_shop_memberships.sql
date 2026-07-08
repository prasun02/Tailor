-- Phase 3 fix: create the no-argument active shop membership RPC used by the frontend.

begin;

drop function if exists public.get_current_user_shop_memberships();

create or replace function public.get_current_user_shop_memberships()
returns table (
  shop_id uuid,
  user_id uuid,
  role public.shop_role,
  is_active boolean,
  shop_name text,
  timezone text,
  currency text,
  default_measurement_unit public.measurement_unit
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    member.shop_id,
    member.user_id,
    member.role,
    member.is_active,
    shop.name as shop_name,
    shop.timezone,
    shop.currency,
    shop.default_measurement_unit
  from public.shop_members member
  join public.shops shop
    on shop.id = member.shop_id
  where auth.uid() is not null
    and member.user_id = auth.uid()
    and member.is_active = true
    and shop.deleted_at is null
  order by member.created_at asc;
$$;

revoke all on function public.get_current_user_shop_memberships() from public;
revoke all on function public.get_current_user_shop_memberships() from anon;
grant execute on function public.get_current_user_shop_memberships() to authenticated;

comment on function public.get_current_user_shop_memberships()
  is 'Returns active shop memberships for the authenticated user for frontend shop selection.';

notify pgrst, 'reload schema';

commit;
