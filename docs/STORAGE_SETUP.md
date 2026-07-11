# Supabase Storage Setup

Tailor Store Manager uses Supabase Storage for garment design images and per-order customer fabric references. URL entry remains available when storage is not configured.

## Buckets

Create these buckets in Supabase Storage:

- `design-assets`: garment style/design images from the Design Library.
- `order-fabric-images`: customer selected fabric or cloth reference images saved per order item.

For the MVP, both buckets are public so the browser can display saved image URLs without a signed URL service.

Accepted image formats:

- `jpg`
- `jpeg`
- `png`
- `webp`

Maximum image size: `5 MB` (`5242880` bytes).

Storage paths are shop-scoped:

- `design-assets`: `{shopId}/designs/{random-file-name}.{ext}`
- `order-fabric-images`: `{shopId}/orders/{orderDraftId-or-itemId}/{random-file-name}.{ext}`

The app does not store base64 images in the database. It stores the public URL or storage reference only.

## Dashboard Steps

1. Open the Supabase Dashboard for the project.
2. Go to Storage.
3. Create `design-assets`.
4. Set it to public for the MVP.
5. Allow MIME types `image/jpeg`, `image/png`, and `image/webp`.
6. Set the file size limit to `5242880`.
7. Create `order-fabric-images` with the same public setting, MIME types, and size limit.
8. Open SQL Editor and run the storage policy SQL below.
9. Test an upload from Design Library and New Order after signing in as an active shop member.

If a bucket is missing, the app shows a warning such as:

```text
Storage bucket "design-assets" is not configured. Create it in Supabase Storage or use the URL field. Required bucket name: design-assets.
```

The page should not crash. Users can still paste an `http` or `https` image URL.

## MVP Security Note

Public buckets mean anyone with the exact public image URL can view that image. Do not upload private identity documents, sensitive customer records, or confidential fabric images.

RLS storage policies still restrict upload, update, and delete actions to authenticated active shop members whose object path starts with that shop id. Public bucket URLs are still public once known.

Recommended MVP roles:

- Design image upload/update/delete: `owner`, `manager`
- Fabric image upload/update/delete: `owner`, `manager`, `staff`
- Read storage objects through authenticated app views: active shop members

## Manual Policy SQL

The repository includes `supabase/migrations/0007_storage_buckets.sql`, which creates public buckets and stricter shop-path policies. If you need a simple manual setup first, use the SQL below, then move to stricter shop path checks before production.

```sql
create policy "Authenticated users can upload design assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'design-assets'
);

create policy "Authenticated users can view design assets"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'design-assets'
);

create policy "Authenticated users can upload fabric images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'order-fabric-images'
);

create policy "Authenticated users can view fabric images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'order-fabric-images'
);

notify pgrst, 'reload schema';
```

For this project, prefer the stricter migration policies because they validate the first folder segment as `shop_id` and check active shop membership.

## Future Private Bucket Plan

For production with stricter privacy requirements:

1. Change buckets from public to private.
2. Store storage paths instead of public URLs for newly uploaded files.
3. Generate short-lived signed URLs in the frontend with the Supabase client after RLS confirms the user can access the row.
4. Keep object paths shop-scoped as `{shopId}/...`.
5. Add stricter storage policies that validate both bucket id and shop id folder membership.

This keeps the MVP free and simple while leaving a clear upgrade path for private media.
