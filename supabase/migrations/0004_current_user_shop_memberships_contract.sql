-- Ensure the shop membership RPC used by the frontend exists with the exact return contract.

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
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  return query
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
  where member.user_id = current_user_id
    and shop.deleted_at is null
  order by member.is_active desc, member.created_at asc;
end;
$$;

revoke all on function public.get_current_user_shop_memberships() from public;
revoke all on function public.get_current_user_shop_memberships() from anon;
grant execute on function public.get_current_user_shop_memberships() to authenticated;

comment on function public.get_current_user_shop_memberships()
  is 'Returns the authenticated user''s own shop memberships with shop display fields for onboarding, suspension, and active shop selection.';

notify pgrst, 'reload schema';

commit;
