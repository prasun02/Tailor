-- Public MVP storage buckets for design previews and per-order fabric references.
-- Object paths must start with the shop id: {shop_id}/folder/file.ext.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('design-assets', 'design-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('order-fabric-images', 'order-fabric-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.storage_object_shop_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  first_segment text;
begin
  first_segment := split_part(coalesce(object_name, ''), '/', 1);

  if first_segment !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;

  return first_segment::uuid;
end;
$$;

create or replace function public.can_access_shop_storage_object(
  target_bucket_id text,
  object_name text,
  allowed_roles public.shop_role[] default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  object_shop_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  if target_bucket_id not in ('design-assets', 'order-fabric-images') then
    return false;
  end if;

  object_shop_id := public.storage_object_shop_id(object_name);

  if object_shop_id is null then
    return false;
  end if;

  if allowed_roles is null then
    return public.is_active_shop_member(object_shop_id);
  end if;

  return public.has_shop_role(object_shop_id, allowed_roles);
end;
$$;

revoke all on function public.can_access_shop_storage_object(text, text, public.shop_role[]) from public;
revoke all on function public.can_access_shop_storage_object(text, text, public.shop_role[]) from anon;
grant execute on function public.can_access_shop_storage_object(text, text, public.shop_role[]) to authenticated;

drop policy if exists "active members can read design assets" on storage.objects;
create policy "active members can read design assets"
on storage.objects for select
to authenticated
using (
  bucket_id = 'design-assets'
  and public.can_access_shop_storage_object(bucket_id, name, null::public.shop_role[])
);

drop policy if exists "owners and managers can upload design assets" on storage.objects;
create policy "owners and managers can upload design assets"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'design-assets'
  and public.can_access_shop_storage_object(bucket_id, name, array['owner', 'manager']::public.shop_role[])
);

drop policy if exists "owners and managers can update design assets" on storage.objects;
create policy "owners and managers can update design assets"
on storage.objects for update
to authenticated
using (
  bucket_id = 'design-assets'
  and public.can_access_shop_storage_object(bucket_id, name, array['owner', 'manager']::public.shop_role[])
)
with check (
  bucket_id = 'design-assets'
  and public.can_access_shop_storage_object(bucket_id, name, array['owner', 'manager']::public.shop_role[])
);

drop policy if exists "owners and managers can delete design assets" on storage.objects;
create policy "owners and managers can delete design assets"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'design-assets'
  and public.can_access_shop_storage_object(bucket_id, name, array['owner', 'manager']::public.shop_role[])
);

drop policy if exists "active members can read order fabric images" on storage.objects;
create policy "active members can read order fabric images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'order-fabric-images'
  and public.can_access_shop_storage_object(bucket_id, name, null::public.shop_role[])
);

drop policy if exists "order staff can upload fabric images" on storage.objects;
create policy "order staff can upload fabric images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'order-fabric-images'
  and public.can_access_shop_storage_object(bucket_id, name, array['owner', 'manager', 'staff']::public.shop_role[])
);

drop policy if exists "order staff can update fabric images" on storage.objects;
create policy "order staff can update fabric images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'order-fabric-images'
  and public.can_access_shop_storage_object(bucket_id, name, array['owner', 'manager', 'staff']::public.shop_role[])
)
with check (
  bucket_id = 'order-fabric-images'
  and public.can_access_shop_storage_object(bucket_id, name, array['owner', 'manager', 'staff']::public.shop_role[])
);

drop policy if exists "order staff can delete fabric images" on storage.objects;
create policy "order staff can delete fabric images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'order-fabric-images'
  and public.can_access_shop_storage_object(bucket_id, name, array['owner', 'manager', 'staff']::public.shop_role[])
);

comment on function public.can_access_shop_storage_object(text, text, public.shop_role[])
is 'Validates authenticated shop membership for storage object paths that start with shop_id/.';

commit;
