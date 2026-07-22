alter table public.customers
  add column if not exists email text;

alter table public.customers
  drop constraint if exists customers_email_format_check;

alter table public.customers
  add constraint customers_email_format_check
  check (
    email is null
    or (email = btrim(email) and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
  );

create index if not exists customers_email_idx
  on public.customers (shop_id, lower(email))
  where email is not null and deleted_at is null;
