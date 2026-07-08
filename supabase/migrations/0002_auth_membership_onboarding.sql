-- Phase 3: authentication membership lookup for onboarding and suspension handling.

begin;

create unique index if not exists shops_unique_active_created_by_normalized_name
  on public.shops (created_by, lower(btrim(name)))
  where deleted_at is null;

create or replace function public.get_current_user_shop_memberships()
returns table (
  shop_id uuid,
  user_id uuid,
  role public.shop_role,
  is_active boolean,
  shop_name text,
  shop_deleted_at timestamptz,
  membership_created_at timestamptz
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
    shop.deleted_at as shop_deleted_at,
    member.created_at as membership_created_at
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
  is 'Returns only the authenticated user''s own shop memberships, including inactive rows, for onboarding and suspension routing.';

commit;
