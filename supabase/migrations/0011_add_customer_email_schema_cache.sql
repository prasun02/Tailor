alter table public.customers
  add column if not exists email text;

create index if not exists customers_shop_email_idx
  on public.customers (shop_id, email)
  where email is not null and deleted_at is null;

NOTIFY pgrst, 'reload schema';
