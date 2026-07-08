-- Tailor Store Manager initial schema
-- Safe for a new Supabase project. Do not rerun after production use.

begin;

create extension if not exists pgcrypto;

create type public.shop_role as enum ('owner', 'manager', 'staff', 'cutter', 'tailor', 'viewer');
create type public.measurement_unit as enum ('inch', 'cm');
create type public.measurement_field_type as enum ('number', 'text', 'textarea', 'select', 'checkbox');
create type public.style_field_type as enum ('select', 'multiselect', 'text', 'number', 'checkbox', 'textarea');
create type public.order_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.order_status as enum ('draft', 'confirmed', 'in_progress', 'ready', 'partially_delivered', 'delivered', 'cancelled');
create type public.production_status as enum (
  'order_received',
  'measurement_confirmed',
  'cutting',
  'stitching',
  'finishing',
  'ironing',
  'quality_check',
  'ready',
  'delivered',
  'cancelled'
);
create type public.payment_method as enum ('cash', 'card', 'bank_transfer', 'mobile_banking', 'other');
create type public.payment_status as enum ('completed', 'voided');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  phone text,
  address text,
  logo_url text,
  timezone text not null default 'Asia/Dhaka',
  currency text not null default 'BDT',
  default_measurement_unit public.measurement_unit not null default 'inch',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.shop_members (
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.shop_role not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (shop_id, user_id),
  unique (shop_id, user_id)
);

create table public.shop_counters (
  shop_id uuid primary key references public.shops(id) on delete cascade,
  customer_next_number integer not null default 1 check (customer_next_number > 0),
  order_next_number integer not null default 1 check (order_next_number > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.garment_types (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  name_bn text,
  code text not null check (code ~ '^[A-Z0-9_]{2,20}$'),
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (shop_id, code)
);

create table public.measurement_fields (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  garment_type_id uuid not null references public.garment_types(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 2 and 80),
  label_bn text,
  field_key text not null check (field_key ~ '^[a-z][a-z0-9_]{1,60}$'),
  field_type public.measurement_field_type not null default 'number',
  unit public.measurement_unit,
  placeholder text,
  help_text text,
  minimum_value numeric(10, 2),
  maximum_value numeric(10, 2),
  step_value numeric(10, 2) not null default 0.25 check (step_value > 0),
  is_required boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (shop_id, garment_type_id, field_key),
  check (minimum_value is null or maximum_value is null or minimum_value <= maximum_value)
);

create table public.style_fields (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  garment_type_id uuid not null references public.garment_types(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 2 and 80),
  label_bn text,
  field_key text not null check (field_key ~ '^[a-z][a-z0-9_]{1,60}$'),
  field_type public.style_field_type not null default 'select',
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  is_required boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (shop_id, garment_type_id, field_key)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_code text not null check (char_length(btrim(customer_code)) between 2 and 40),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  normalized_name text not null,
  phone text,
  normalized_phone text,
  alternative_phone text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (shop_id, customer_code)
);

create table public.measurement_sets (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  garment_type_id uuid not null references public.garment_types(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  unit public.measurement_unit not null default 'inch',
  values jsonb not null check (jsonb_typeof(values) = 'object'),
  notes text,
  measured_at timestamptz not null default now(),
  measured_by uuid references auth.users(id) on delete set null,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  unique (shop_id, customer_id, garment_type_id, version_number)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  order_number text not null check (char_length(btrim(order_number)) between 2 and 40),
  customer_id uuid not null references public.customers(id) on delete restrict,
  order_date date not null default ((now() at time zone 'Asia/Dhaka')::date),
  trial_date date,
  delivery_date date,
  priority public.order_priority not null default 'normal',
  overall_status public.order_status not null default 'confirmed',
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (shop_id, order_number),
  check (discount_amount <= subtotal),
  check (total_amount = subtotal - discount_amount)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  garment_type_id uuid not null references public.garment_types(id) on delete restrict,
  garment_name_snapshot text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  line_total numeric(12, 2) not null default 0 check (line_total >= 0),
  measurement_set_id uuid references public.measurement_sets(id) on delete restrict,
  measurement_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(measurement_snapshot) = 'object'),
  style_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(style_snapshot) = 'object'),
  special_instructions text,
  assigned_to uuid references auth.users(id) on delete set null,
  production_status public.production_status not null default 'order_received',
  item_delivery_date date,
  design_reference_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  payment_method public.payment_method not null default 'cash',
  payment_status public.payment_status not null default 'completed',
  reference text,
  notes text,
  paid_at timestamptz not null default now(),
  received_by uuid references auth.users(id) on delete set null,
  voided_at timestamptz,
  voided_by uuid references auth.users(id) on delete set null,
  void_reason text,
  created_at timestamptz not null default now(),
  check ((payment_status = 'voided' and voided_at is not null and void_reason is not null) or payment_status = 'completed')
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete cascade,
  previous_status text,
  new_status text not null,
  note text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create unique index customers_unique_active_normalized_phone
  on public.customers (shop_id, normalized_phone)
  where normalized_phone is not null and is_active = true and deleted_at is null;

create unique index measurement_sets_one_current_per_garment
  on public.measurement_sets (shop_id, customer_id, garment_type_id)
  where is_current = true;

create index profiles_phone_idx on public.profiles (phone);
create index shops_created_by_idx on public.shops (created_by) where deleted_at is null;
create index shop_members_user_active_idx on public.shop_members (user_id, is_active, shop_id);
create index shop_members_shop_role_idx on public.shop_members (shop_id, role, is_active);
create index garment_types_shop_active_idx on public.garment_types (shop_id, is_active, sort_order) where deleted_at is null;
create index measurement_fields_shop_garment_idx on public.measurement_fields (shop_id, garment_type_id, is_active, sort_order) where deleted_at is null;
create index style_fields_shop_garment_idx on public.style_fields (shop_id, garment_type_id, is_active, sort_order) where deleted_at is null;
create index customers_phone_idx on public.customers (shop_id, normalized_phone) where deleted_at is null;
create index customers_normalized_name_idx on public.customers (shop_id, normalized_name) where deleted_at is null;
create index customers_code_idx on public.customers (shop_id, customer_code) where deleted_at is null;
create index measurement_sets_current_idx on public.measurement_sets (shop_id, customer_id, garment_type_id, is_current);
create index orders_number_idx on public.orders (shop_id, order_number) where deleted_at is null;
create index orders_delivery_date_idx on public.orders (shop_id, delivery_date) where deleted_at is null;
create index orders_status_idx on public.orders (shop_id, overall_status) where deleted_at is null;
create index orders_customer_history_idx on public.orders (shop_id, customer_id, order_date desc) where deleted_at is null;
create index order_items_status_idx on public.order_items (shop_id, production_status);
create index order_items_assigned_idx on public.order_items (shop_id, assigned_to, production_status) where assigned_to is not null;
create index payments_order_idx on public.payments (shop_id, order_id, payment_status);
create index order_status_history_order_idx on public.order_status_history (shop_id, order_id, changed_at desc);
create index audit_logs_shop_created_idx on public.audit_logs (shop_id, created_at desc);
comment on table public.shop_members is 'Membership table is queried by SECURITY DEFINER helper functions to avoid RLS recursion in shop policies.';
comment on table public.payments is 'Payments are append-only. Voids update status and metadata; rows are never deleted by normal users.';
comment on table public.measurement_sets is 'Measurement values are historical snapshots. The values JSONB is protected from updates by trigger.';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.normalize_phone(raw_phone text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select nullif(regexp_replace(coalesce(raw_phone, ''), '[^0-9]+', '', 'g'), '');
$$;

create or replace function public.normalize_search_name(raw_name text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select lower(btrim(regexp_replace(coalesce(raw_name, ''), '\s+', ' ', 'g')));
$$;

create or replace function public.is_active_shop_member(target_shop_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select target_user_id is not null
    and exists (
      select 1
      from public.shop_members member
      where member.shop_id = target_shop_id
        and member.user_id = target_user_id
        and member.is_active = true
    );
$$;

create or replace function public.has_shop_role(
  target_shop_id uuid,
  allowed_roles public.shop_role[],
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select target_user_id is not null
    and exists (
      select 1
      from public.shop_members member
      where member.shop_id = target_shop_id
        and member.user_id = target_user_id
        and member.is_active = true
        and member.role = any(allowed_roles)
    );
$$;

create or replace function public.current_user_shop_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select member.shop_id
  from public.shop_members member
  where member.user_id = auth.uid()
    and member.is_active = true;
$$;

create or replace function public.set_customer_normalized_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.normalized_name := public.normalize_search_name(new.name);
  new.normalized_phone := public.normalize_phone(new.phone);
  new.alternative_phone := nullif(btrim(new.alternative_phone), '');
  return new;
end;
$$;

create or replace function public.prevent_measurement_value_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Measurement history cannot be deleted.';
  end if;

  if old.values is distinct from new.values
    or old.version_number is distinct from new.version_number
    or old.customer_id is distinct from new.customer_id
    or old.garment_type_id is distinct from new.garment_type_id
    or old.unit is distinct from new.unit then
    raise exception 'Measurement history is immutable. Create a new measurement version instead.';
  end if;

  return new;
end;
$$;

create or replace function public.calculate_order_item_line_total()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.line_total := new.quantity * new.unit_price;
  return new;
end;
$$;

create or replace function public.prevent_payment_delete()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Payments cannot be deleted. Void the payment instead.';
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger shops_set_updated_at
before update on public.shops
for each row execute function public.set_updated_at();

create trigger shop_members_set_updated_at
before update on public.shop_members
for each row execute function public.set_updated_at();

create trigger shop_counters_set_updated_at
before update on public.shop_counters
for each row execute function public.set_updated_at();

create trigger garment_types_set_updated_at
before update on public.garment_types
for each row execute function public.set_updated_at();

create trigger measurement_fields_set_updated_at
before update on public.measurement_fields
for each row execute function public.set_updated_at();

create trigger style_fields_set_updated_at
before update on public.style_fields
for each row execute function public.set_updated_at();

create trigger customers_set_normalized_fields
before insert or update of name, phone, alternative_phone on public.customers
for each row execute function public.set_customer_normalized_fields();

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger measurement_sets_prevent_value_mutation
before update or delete on public.measurement_sets
for each row execute function public.prevent_measurement_value_mutation();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger order_items_calculate_line_total
before insert or update of quantity, unit_price on public.order_items
for each row execute function public.calculate_order_item_line_total();

create trigger order_items_set_updated_at
before update on public.order_items
for each row execute function public.set_updated_at();

create trigger payments_prevent_delete
before delete on public.payments
for each row execute function public.prevent_payment_delete();

create or replace function public.create_shop_with_owner(
  owner_full_name text,
  owner_phone text,
  shop_name text,
  shop_phone text default null,
  shop_address text default null,
  shop_logo_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_shop_name text := btrim(shop_name);
  existing_shop_id uuid;
  new_shop_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if normalized_shop_name is null or char_length(normalized_shop_name) < 2 or char_length(normalized_shop_name) > 120 then
    raise exception 'Shop name must be between 2 and 120 characters.';
  end if;

  insert into public.profiles (id, full_name, phone)
  values (current_user_id, nullif(btrim(owner_full_name), ''), public.normalize_phone(owner_phone))
  on conflict (id) do update
  set full_name = excluded.full_name,
      phone = excluded.phone,
      updated_at = now();

  select shops.id into existing_shop_id
  from public.shops shops
  join public.shop_members members
    on members.shop_id = shops.id
   and members.user_id = current_user_id
   and members.role = 'owner'
   and members.is_active = true
  where shops.deleted_at is null
    and lower(btrim(shops.name)) = lower(normalized_shop_name)
  limit 1;

  if existing_shop_id is not null then
    return existing_shop_id;
  end if;

  insert into public.shops (name, phone, address, logo_url, created_by)
  values (
    normalized_shop_name,
    public.normalize_phone(shop_phone),
    nullif(btrim(shop_address), ''),
    nullif(btrim(shop_logo_url), ''),
    current_user_id
  )
  returning id into new_shop_id;

  insert into public.shop_members (shop_id, user_id, role, is_active)
  values (new_shop_id, current_user_id, 'owner', true);

  insert into public.shop_counters (shop_id)
  values (new_shop_id);

  insert into public.garment_types (shop_id, name, name_bn, code, description, sort_order)
  values
    (new_shop_id, 'Shirt', '?????', 'SHIRT', 'Standard shirt garment type', 10),
    (new_shop_id, 'Pant', '???????', 'PANT', 'Standard pant garment type', 20),
    (new_shop_id, 'Panjabi', '????????', 'PANJABI', 'Traditional Panjabi garment type', 30),
    (new_shop_id, 'Suit', '?????', 'SUIT', 'Two-piece or three-piece suit', 40),
    (new_shop_id, 'Blazer', '???????', 'BLAZER', 'Blazer garment type', 50),
    (new_shop_id, 'Pajama', '??????', 'PAJAMA', 'Pajama garment type', 60),
    (new_shop_id, 'Waistcoat', '??????????', 'WAISTCOAT', 'Waistcoat garment type', 70),
    (new_shop_id, 'Other', '????????', 'OTHER', 'Custom garment type', 999);

  insert into public.measurement_fields (
    shop_id, garment_type_id, label, label_bn, field_key, field_type, unit, placeholder,
    minimum_value, maximum_value, step_value, is_required, sort_order
  )
  select new_shop_id, garment.id, seed.label, seed.label_bn, seed.field_key, 'number', 'inch', seed.placeholder,
         0, 120, 0.25, seed.is_required, seed.sort_order
  from public.garment_types garment
  cross join (values
    ('Shirt length', '??????? ?????', 'shirt_length', 'Length', true, 10),
    ('Chest', '???', 'chest', 'Chest', true, 20),
    ('Waist', '????', 'waist', 'Waist', true, 30),
    ('Hip', '???', 'hip', 'Hip', false, 40),
    ('Shoulder', '????', 'shoulder', 'Shoulder', true, 50),
    ('Sleeve length', '????? ?????', 'sleeve_length', 'Sleeve', true, 60),
    ('Armhole', '???????', 'armhole', 'Armhole', false, 70),
    ('Bicep', '??????', 'bicep', 'Bicep', false, 80),
    ('Wrist', '????', 'wrist', 'Wrist', false, 90),
    ('Neck', '???', 'neck', 'Neck', true, 100)
  ) as seed(label, label_bn, field_key, placeholder, is_required, sort_order)
  where garment.shop_id = new_shop_id and garment.code = 'SHIRT';

  insert into public.measurement_fields (
    shop_id, garment_type_id, label, label_bn, field_key, field_type, unit, placeholder,
    minimum_value, maximum_value, step_value, is_required, sort_order
  )
  select new_shop_id, garment.id, seed.label, seed.label_bn, seed.field_key, 'number', 'inch', seed.placeholder,
         0, 120, 0.25, seed.is_required, seed.sort_order
  from public.garment_types garment
  cross join (values
    ('Pant length', '????????? ?????', 'pant_length', 'Length', true, 10),
    ('Waist', '????', 'waist', 'Waist', true, 20),
    ('Hip', '???', 'hip', 'Hip', true, 30),
    ('Thigh', '???', 'thigh', 'Thigh', false, 40),
    ('Knee', '?????', 'knee', 'Knee', false, 50),
    ('Bottom', '???', 'bottom', 'Bottom', true, 60),
    ('Inseam', '?????', 'inseam', 'Inseam', false, 70),
    ('Front rise', '?????? ????', 'front_rise', 'Front rise', false, 80),
    ('Back rise', '????? ????', 'back_rise', 'Back rise', false, 90),
    ('Crotch', '????', 'crotch', 'Crotch', false, 100)
  ) as seed(label, label_bn, field_key, placeholder, is_required, sort_order)
  where garment.shop_id = new_shop_id and garment.code = 'PANT';

  insert into public.measurement_fields (
    shop_id, garment_type_id, label, label_bn, field_key, field_type, unit, placeholder,
    minimum_value, maximum_value, step_value, is_required, sort_order
  )
  select new_shop_id, garment.id, seed.label, seed.label_bn, seed.field_key, 'number', 'inch', seed.placeholder,
         0, 120, 0.25, seed.is_required, seed.sort_order
  from public.garment_types garment
  cross join (values
    ('Panjabi length', '????????? ?????', 'panjabi_length', 'Length', true, 10),
    ('Chest', '???', 'chest', 'Chest', true, 20),
    ('Waist', '????', 'waist', 'Waist', true, 30),
    ('Hip', '???', 'hip', 'Hip', true, 40),
    ('Shoulder', '????', 'shoulder', 'Shoulder', true, 50),
    ('Sleeve length', '????? ?????', 'sleeve_length', 'Sleeve', true, 60),
    ('Neck', '???', 'neck', 'Neck', true, 70),
    ('Bottom opening', '??? ??????', 'bottom_opening', 'Opening', false, 80)
  ) as seed(label, label_bn, field_key, placeholder, is_required, sort_order)
  where garment.shop_id = new_shop_id and garment.code = 'PANJABI';

  insert into public.measurement_fields (
    shop_id, garment_type_id, label, label_bn, field_key, field_type, unit, placeholder,
    minimum_value, maximum_value, step_value, is_required, sort_order
  )
  select new_shop_id, garment.id, seed.label, seed.label_bn, seed.field_key, 'number', 'inch', seed.placeholder,
         0, 120, 0.25, seed.is_required, seed.sort_order
  from public.garment_types garment
  cross join (values
    ('Coat length', '????? ?????', 'coat_length', 'Coat length', true, 10),
    ('Chest', '???', 'chest', 'Chest', true, 20),
    ('Waist', '????', 'waist', 'Waist', true, 30),
    ('Hip', '???', 'hip', 'Hip', false, 40),
    ('Shoulder', '????', 'shoulder', 'Shoulder', true, 50),
    ('Sleeve length', '????? ?????', 'sleeve_length', 'Sleeve', true, 60),
    ('Pant length', '????????? ?????', 'pant_length', 'Pant length', true, 70),
    ('Pant waist', '??????? ????', 'pant_waist', 'Pant waist', true, 80),
    ('Pant bottom', '??????? ???', 'pant_bottom', 'Pant bottom', true, 90)
  ) as seed(label, label_bn, field_key, placeholder, is_required, sort_order)
  where garment.shop_id = new_shop_id and garment.code = 'SUIT';

  insert into public.style_fields (shop_id, garment_type_id, label, label_bn, field_key, field_type, options, is_required, sort_order)
  select new_shop_id, garment.id, seed.label, seed.label_bn, seed.field_key, seed.field_type::public.style_field_type, seed.options::jsonb, seed.is_required, seed.sort_order
  from public.garment_types garment
  cross join (values
    ('Sleeve type', '????? ???', 'sleeve_type', 'select', '["Full sleeve", "Half sleeve", "Roll-up"]', true, 10),
    ('Collar type', '?????? ???', 'collar_type', 'select', '["Regular", "Button down", "Mandarin", "Spread"]', true, 20),
    ('Cuff type', '????? ???', 'cuff_type', 'select', '["Regular", "French", "Round", "Square"]', false, 30),
    ('Pocket type', '?????? ???', 'pocket_type', 'select', '["No pocket", "Single", "Double"]', false, 40),
    ('Number of pockets', '???? ??????', 'number_of_pockets', 'number', '[]', false, 50),
    ('Fit', '???', 'fit', 'select', '["Regular", "Slim", "Loose"]', true, 60),
    ('Front style', '?????? ??????', 'front_style', 'select', '["Plain", "Placket", "Hidden placket"]', false, 70),
    ('Back pleat', '????? ?????', 'back_pleat', 'select', '["None", "Center", "Side"]', false, 80),
    ('Bottom style', '??? ??????', 'bottom_style', 'select', '["Straight", "Round"]', false, 90)
  ) as seed(label, label_bn, field_key, field_type, options, is_required, sort_order)
  where garment.shop_id = new_shop_id and garment.code = 'SHIRT';

  insert into public.style_fields (shop_id, garment_type_id, label, label_bn, field_key, field_type, options, is_required, sort_order)
  select new_shop_id, garment.id, seed.label, seed.label_bn, seed.field_key, seed.field_type::public.style_field_type, seed.options::jsonb, seed.is_required, seed.sort_order
  from public.garment_types garment
  cross join (values
    ('Fit', '???', 'fit', 'select', '["Regular", "Slim", "Loose"]', true, 10),
    ('Pleat type', '??????? ???', 'pleat_type', 'select', '["Flat front", "Single pleat", "Double pleat"]', false, 20),
    ('Front pocket type', '?????? ????', 'front_pocket_type', 'select', '["Side", "Slant", "Jeans"]', false, 30),
    ('Back pocket type', '?????? ????', 'back_pocket_type', 'select', '["None", "Single", "Double"]', false, 40),
    ('Belt style', '????? ??????', 'belt_style', 'select', '["Belt loop", "Side adjuster", "Elastic"]', false, 50),
    ('Bottom style', '??? ??????', 'bottom_style', 'select', '["Plain", "Turn-up", "Elastic"]', false, 60)
  ) as seed(label, label_bn, field_key, field_type, options, is_required, sort_order)
  where garment.shop_id = new_shop_id and garment.code = 'PANT';

  insert into public.style_fields (shop_id, garment_type_id, label, label_bn, field_key, field_type, options, is_required, sort_order)
  select new_shop_id, garment.id, seed.label, seed.label_bn, seed.field_key, seed.field_type::public.style_field_type, seed.options::jsonb, seed.is_required, seed.sort_order
  from public.garment_types garment
  cross join (values
    ('Collar type', '?????? ???', 'collar_type', 'select', '["Mandarin", "Regular", "No collar"]', true, 10),
    ('Sleeve type', '????? ???', 'sleeve_type', 'select', '["Full sleeve", "Half sleeve"]', true, 20),
    ('Pocket type', '?????? ???', 'pocket_type', 'select', '["No pocket", "Side", "Chest", "Both"]', false, 30),
    ('Button style', '???? ??????', 'button_style', 'select', '["Visible", "Hidden", "Decorative"]', false, 40),
    ('Side slit', '???? ?????', 'side_slit', 'select', '["Short", "Medium", "Long"]', false, 50),
    ('Fit', '???', 'fit', 'select', '["Regular", "Slim", "Loose"]', true, 60)
  ) as seed(label, label_bn, field_key, field_type, options, is_required, sort_order)
  where garment.shop_id = new_shop_id and garment.code = 'PANJABI';

  insert into public.style_fields (shop_id, garment_type_id, label, label_bn, field_key, field_type, options, is_required, sort_order)
  select new_shop_id, garment.id, seed.label, seed.label_bn, seed.field_key, seed.field_type::public.style_field_type, seed.options::jsonb, seed.is_required, seed.sort_order
  from public.garment_types garment
  cross join (values
    ('Lapel type', '????????? ???', 'lapel_type', 'select', '["Notch", "Peak", "Shawl"]', true, 10),
    ('Button count', '???? ??????', 'button_count', 'number', '[]', true, 20),
    ('Vent style', '????? ??????', 'vent_style', 'select', '["No vent", "Single vent", "Double vent"]', false, 30),
    ('Pocket style', '???? ??????', 'pocket_style', 'select', '["Flap", "Jetted", "Patch"]', false, 40),
    ('Pant pleat', '??????? ?????', 'pant_pleat', 'select', '["Flat front", "Single pleat", "Double pleat"]', false, 50),
    ('Fit', '???', 'fit', 'select', '["Regular", "Slim", "Classic"]', true, 60)
  ) as seed(label, label_bn, field_key, field_type, options, is_required, sort_order)
  where garment.shop_id = new_shop_id and garment.code = 'SUIT';

  insert into public.audit_logs (shop_id, user_id, action, entity_type, entity_id, new_data)
  values (new_shop_id, current_user_id, 'create_shop_with_owner', 'shop', new_shop_id, jsonb_build_object('name', normalized_shop_name));

  return new_shop_id;
end;
$$;

create or replace function public.create_measurement_version(
  target_shop_id uuid,
  target_customer_id uuid,
  target_garment_type_id uuid,
  target_unit public.measurement_unit,
  measurement_values jsonb,
  measurement_notes text default null
)
returns public.measurement_sets
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_version integer;
  created_record public.measurement_sets;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  if not public.has_shop_role(target_shop_id, array['owner', 'manager', 'staff', 'cutter', 'tailor']::public.shop_role[]) then
    raise exception 'You do not have permission to create measurements for this shop.';
  end if;

  if measurement_values is null or jsonb_typeof(measurement_values) <> 'object' then
    raise exception 'Measurement values must be a JSON object.';
  end if;

  if not exists (
    select 1 from public.customers customer
    where customer.id = target_customer_id
      and customer.shop_id = target_shop_id
      and customer.deleted_at is null
      and customer.is_active = true
  ) then
    raise exception 'Customer was not found for this shop.';
  end if;

  if not exists (
    select 1 from public.garment_types garment
    where garment.id = target_garment_type_id
      and garment.shop_id = target_shop_id
      and garment.deleted_at is null
      and garment.is_active = true
  ) then
    raise exception 'Garment type was not found for this shop.';
  end if;

  perform pg_advisory_xact_lock(hashtext(target_shop_id::text || ':' || target_customer_id::text || ':' || target_garment_type_id::text));

  select coalesce(max(version_number), 0) + 1 into next_version
  from public.measurement_sets
  where shop_id = target_shop_id
    and customer_id = target_customer_id
    and garment_type_id = target_garment_type_id;

  update public.measurement_sets
  set is_current = false
  where shop_id = target_shop_id
    and customer_id = target_customer_id
    and garment_type_id = target_garment_type_id
    and is_current = true;

  insert into public.measurement_sets (
    shop_id,
    customer_id,
    garment_type_id,
    version_number,
    unit,
    values,
    notes,
    measured_by,
    is_current
  )
  values (
    target_shop_id,
    target_customer_id,
    target_garment_type_id,
    next_version,
    coalesce(target_unit, 'inch'),
    measurement_values,
    nullif(btrim(measurement_notes), ''),
    auth.uid(),
    true
  )
  returning * into created_record;

  insert into public.audit_logs (shop_id, user_id, action, entity_type, entity_id, new_data)
  values (target_shop_id, auth.uid(), 'create_measurement_version', 'measurement_set', created_record.id, to_jsonb(created_record));

  return created_record;
end;
$$;

create or replace function public.create_order_with_items(
  target_shop_id uuid,
  target_customer_id uuid,
  order_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  order_counter integer;
  generated_order_number text;
  item_payload jsonb;
  item_garment_id uuid;
  item_measurement_id uuid;
  item_assigned_to uuid;
  item_quantity integer;
  item_unit_price numeric(12, 2);
  item_line_total numeric(12, 2);
  item_status public.production_status;
  item_style_snapshot jsonb;
  item_measurement_snapshot jsonb;
  item_garment_name text;
  subtotal_value numeric(12, 2) := 0;
  discount_value numeric(12, 2) := 0;
  total_value numeric(12, 2) := 0;
  created_order public.orders;
  created_item public.order_items;
  advance_payment jsonb;
  advance_amount numeric(12, 2);
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  if not public.has_shop_role(target_shop_id, array['owner', 'manager', 'staff']::public.shop_role[]) then
    raise exception 'You do not have permission to create orders for this shop.';
  end if;

  if order_payload is null or jsonb_typeof(order_payload) <> 'object' then
    raise exception 'Order payload must be a JSON object.';
  end if;

  if jsonb_typeof(order_payload->'items') <> 'array' or jsonb_array_length(order_payload->'items') = 0 then
    raise exception 'Order must include at least one item.';
  end if;

  if not exists (
    select 1 from public.customers customer
    where customer.id = target_customer_id
      and customer.shop_id = target_shop_id
      and customer.deleted_at is null
      and customer.is_active = true
  ) then
    raise exception 'Customer was not found for this shop.';
  end if;

  for item_payload in select * from jsonb_array_elements(order_payload->'items') loop
    item_garment_id := (item_payload->>'garment_type_id')::uuid;
    item_quantity := coalesce((item_payload->>'quantity')::integer, 1);
    item_unit_price := coalesce((item_payload->>'unit_price')::numeric, 0);

    if item_quantity <= 0 then
      raise exception 'Order item quantity must be greater than zero.';
    end if;

    if item_unit_price < 0 then
      raise exception 'Order item unit price cannot be negative.';
    end if;

    if not exists (
      select 1 from public.garment_types garment
      where garment.id = item_garment_id
        and garment.shop_id = target_shop_id
        and garment.deleted_at is null
        and garment.is_active = true
    ) then
      raise exception 'Order item garment type was not found for this shop.';
    end if;

    item_measurement_id := nullif(item_payload->>'measurement_set_id', '')::uuid;
    if item_measurement_id is not null and not exists (
      select 1 from public.measurement_sets measurement
      where measurement.id = item_measurement_id
        and measurement.shop_id = target_shop_id
        and measurement.customer_id = target_customer_id
        and measurement.garment_type_id = item_garment_id
    ) then
      raise exception 'Measurement set does not belong to this customer and garment.';
    end if;

    item_assigned_to := nullif(item_payload->>'assigned_to', '')::uuid;
    if item_assigned_to is not null and not public.is_active_shop_member(target_shop_id, item_assigned_to) then
      raise exception 'Assigned worker must be an active member of this shop.';
    end if;

    subtotal_value := subtotal_value + (item_quantity * item_unit_price);
  end loop;

  discount_value := coalesce((order_payload->>'discount_amount')::numeric, 0);
  if discount_value < 0 or discount_value > subtotal_value then
    raise exception 'Discount must be between zero and the subtotal.';
  end if;

  total_value := subtotal_value - discount_value;

  update public.shop_counters
  set order_next_number = order_next_number + 1
  where shop_id = target_shop_id
  returning order_next_number - 1 into order_counter;

  if order_counter is null then
    raise exception 'Shop counters are not initialized.';
  end if;

  generated_order_number := 'ORD-' || to_char(now() at time zone 'Asia/Dhaka', 'YYYYMM') || '-' || lpad(order_counter::text, 5, '0');

  insert into public.orders (
    shop_id,
    order_number,
    customer_id,
    order_date,
    trial_date,
    delivery_date,
    priority,
    overall_status,
    subtotal,
    discount_amount,
    total_amount,
    notes,
    created_by
  )
  values (
    target_shop_id,
    generated_order_number,
    target_customer_id,
    coalesce((order_payload->>'order_date')::date, (now() at time zone 'Asia/Dhaka')::date),
    nullif(order_payload->>'trial_date', '')::date,
    nullif(order_payload->>'delivery_date', '')::date,
    coalesce(nullif(order_payload->>'priority', '')::public.order_priority, 'normal'),
    'confirmed',
    subtotal_value,
    discount_value,
    total_value,
    nullif(btrim(order_payload->>'notes'), ''),
    auth.uid()
  )
  returning * into created_order;

  insert into public.order_status_history (shop_id, order_id, previous_status, new_status, note, changed_by)
  values (target_shop_id, created_order.id, null, created_order.overall_status::text, 'Order created', auth.uid());

  for item_payload in select * from jsonb_array_elements(order_payload->'items') loop
    item_garment_id := (item_payload->>'garment_type_id')::uuid;
    item_quantity := coalesce((item_payload->>'quantity')::integer, 1);
    item_unit_price := coalesce((item_payload->>'unit_price')::numeric, 0);
    item_measurement_id := nullif(item_payload->>'measurement_set_id', '')::uuid;
    item_assigned_to := nullif(item_payload->>'assigned_to', '')::uuid;
    item_status := coalesce(nullif(item_payload->>'production_status', '')::public.production_status, 'order_received');
    item_style_snapshot := coalesce(item_payload->'style_snapshot', '{}'::jsonb);

    if jsonb_typeof(item_style_snapshot) <> 'object' then
      raise exception 'Style snapshot must be a JSON object.';
    end if;

    select garment.name into item_garment_name
    from public.garment_types garment
    where garment.id = item_garment_id and garment.shop_id = target_shop_id;

    if item_measurement_id is null then
      item_measurement_snapshot := '{}'::jsonb;
    else
      select measurement.values into item_measurement_snapshot
      from public.measurement_sets measurement
      where measurement.id = item_measurement_id
        and measurement.shop_id = target_shop_id;
    end if;

    insert into public.order_items (
      shop_id,
      order_id,
      garment_type_id,
      garment_name_snapshot,
      quantity,
      unit_price,
      line_total,
      measurement_set_id,
      measurement_snapshot,
      style_snapshot,
      special_instructions,
      assigned_to,
      production_status,
      item_delivery_date,
      design_reference_url
    )
    values (
      target_shop_id,
      created_order.id,
      item_garment_id,
      item_garment_name,
      item_quantity,
      item_unit_price,
      item_quantity * item_unit_price,
      item_measurement_id,
      coalesce(item_measurement_snapshot, '{}'::jsonb),
      item_style_snapshot,
      nullif(btrim(item_payload->>'special_instructions'), ''),
      item_assigned_to,
      item_status,
      nullif(item_payload->>'item_delivery_date', '')::date,
      nullif(btrim(item_payload->>'design_reference_url'), '')
    )
    returning * into created_item;

    insert into public.order_status_history (shop_id, order_id, order_item_id, previous_status, new_status, note, changed_by)
    values (target_shop_id, created_order.id, created_item.id, null, created_item.production_status::text, 'Order item created', auth.uid());
  end loop;

  advance_payment := order_payload->'advance_payment';
  if advance_payment is not null and jsonb_typeof(advance_payment) = 'object' then
    advance_amount := coalesce((advance_payment->>'amount')::numeric, 0);

    if advance_amount < 0 then
      raise exception 'Advance payment cannot be negative.';
    end if;

    if advance_amount > total_value then
      raise exception 'Advance payment cannot exceed the order total.';
    end if;

    if advance_amount > 0 then
      insert into public.payments (
        shop_id,
        order_id,
        amount,
        payment_method,
        reference,
        notes,
        paid_at,
        received_by
      )
      values (
        target_shop_id,
        created_order.id,
        advance_amount,
        coalesce(nullif(advance_payment->>'payment_method', '')::public.payment_method, 'cash'),
        nullif(btrim(advance_payment->>'reference'), ''),
        nullif(btrim(advance_payment->>'notes'), ''),
        coalesce(nullif(advance_payment->>'paid_at', '')::timestamptz, now()),
        auth.uid()
      );
    end if;
  end if;

  insert into public.audit_logs (shop_id, user_id, action, entity_type, entity_id, new_data)
  values (target_shop_id, auth.uid(), 'create_order_with_items', 'order', created_order.id, to_jsonb(created_order));

  return jsonb_build_object(
    'order', to_jsonb(created_order),
    'items', coalesce((select jsonb_agg(to_jsonb(item)) from public.order_items item where item.order_id = created_order.id), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(to_jsonb(payment)) from public.payments payment where payment.order_id = created_order.id), '[]'::jsonb)
  );
end;
$$;

create or replace function public.record_order_payment(
  target_shop_id uuid,
  target_order_id uuid,
  payment_amount numeric,
  target_payment_method public.payment_method,
  payment_reference text default null,
  payment_notes text default null,
  allow_overpayment boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  order_total numeric(12, 2);
  paid_total numeric(12, 2);
  due_total numeric(12, 2);
  new_paid_total numeric(12, 2);
  new_due_total numeric(12, 2);
  inserted_payment_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  if not public.has_shop_role(target_shop_id, array['owner', 'manager', 'staff']::public.shop_role[]) then
    raise exception 'You do not have permission to record payments for this shop.';
  end if;

  if payment_amount is null or payment_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.';
  end if;

  select orders.total_amount into order_total
  from public.orders orders
  where orders.id = target_order_id
    and orders.shop_id = target_shop_id
    and orders.deleted_at is null;

  if order_total is null then
    raise exception 'Order was not found for this shop.';
  end if;

  select coalesce(sum(payments.amount), 0) into paid_total
  from public.payments payments
  where payments.shop_id = target_shop_id
    and payments.order_id = target_order_id
    and payments.payment_status = 'completed';

  due_total := order_total - paid_total;

  if payment_amount > due_total and not (allow_overpayment and public.has_shop_role(target_shop_id, array['owner']::public.shop_role[])) then
    raise exception 'Payment exceeds due amount.';
  end if;

  insert into public.payments (
    shop_id,
    order_id,
    amount,
    payment_method,
    reference,
    notes,
    paid_at,
    received_by
  )
  values (
    target_shop_id,
    target_order_id,
    payment_amount,
    coalesce(target_payment_method, 'cash'),
    nullif(btrim(payment_reference), ''),
    nullif(btrim(payment_notes), ''),
    now(),
    auth.uid()
  )
  returning id into inserted_payment_id;

  new_paid_total := paid_total + payment_amount;
  new_due_total := order_total - new_paid_total;

  insert into public.audit_logs (shop_id, user_id, action, entity_type, entity_id, new_data)
  values (target_shop_id, auth.uid(), 'record_order_payment', 'payment', inserted_payment_id, jsonb_build_object('amount', payment_amount));

  return jsonb_build_object(
    'payment_id', inserted_payment_id,
    'total_paid', new_paid_total,
    'due_amount', new_due_total
  );
end;
$$;

create or replace function public.change_order_item_status(
  target_shop_id uuid,
  target_order_item_id uuid,
  target_status public.production_status,
  status_note text default null
)
returns public.order_items
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_item public.order_items;
  updated_item public.order_items;
  elevated boolean;
  production_member boolean;
  total_items integer;
  delivered_items integer;
  ready_or_delivered_items integer;
  cancelled_items integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  elevated := public.has_shop_role(target_shop_id, array['owner', 'manager', 'staff']::public.shop_role[]);
  production_member := public.has_shop_role(target_shop_id, array['cutter', 'tailor']::public.shop_role[]);

  if not elevated and not production_member then
    raise exception 'You do not have permission to update production status.';
  end if;

  select * into existing_item
  from public.order_items item
  where item.id = target_order_item_id
    and item.shop_id = target_shop_id;

  if existing_item.id is null then
    raise exception 'Order item was not found for this shop.';
  end if;

  if production_member and not elevated and existing_item.assigned_to is distinct from auth.uid() then
    raise exception 'Cutters and tailors can update only assigned work.';
  end if;

  if existing_item.production_status = target_status then
    return existing_item;
  end if;

  if existing_item.production_status in ('delivered', 'cancelled') then
    raise exception 'Delivered or cancelled items cannot move to another status.';
  end if;

  if target_status = 'cancelled' and not public.has_shop_role(target_shop_id, array['owner', 'manager']::public.shop_role[]) then
    raise exception 'Only owners and managers can cancel an item.';
  end if;

  if target_status = 'delivered' and existing_item.production_status <> 'ready' and not elevated then
    raise exception 'Only ready items can be delivered by production staff.';
  end if;

  update public.order_items
  set production_status = target_status
  where id = existing_item.id
  returning * into updated_item;

  insert into public.order_status_history (
    shop_id,
    order_id,
    order_item_id,
    previous_status,
    new_status,
    note,
    changed_by
  )
  values (
    target_shop_id,
    updated_item.order_id,
    updated_item.id,
    existing_item.production_status::text,
    target_status::text,
    nullif(btrim(status_note), ''),
    auth.uid()
  );

  select
    count(*),
    count(*) filter (where production_status = 'delivered'),
    count(*) filter (where production_status in ('ready', 'delivered')),
    count(*) filter (where production_status = 'cancelled')
  into total_items, delivered_items, ready_or_delivered_items, cancelled_items
  from public.order_items
  where order_id = updated_item.order_id;

  update public.orders
  set overall_status = case
      when total_items > 0 and cancelled_items = total_items then 'cancelled'::public.order_status
      when total_items > 0 and delivered_items = total_items then 'delivered'::public.order_status
      when delivered_items > 0 then 'partially_delivered'::public.order_status
      when total_items > 0 and ready_or_delivered_items = total_items then 'ready'::public.order_status
      else 'in_progress'::public.order_status
    end,
    delivered_at = case when total_items > 0 and delivered_items = total_items then now() else delivered_at end
  where id = updated_item.order_id;

  insert into public.audit_logs (shop_id, user_id, action, entity_type, entity_id, old_data, new_data)
  values (
    target_shop_id,
    auth.uid(),
    'change_order_item_status',
    'order_item',
    updated_item.id,
    jsonb_build_object('production_status', existing_item.production_status),
    jsonb_build_object('production_status', target_status)
  );

  return updated_item;
end;
$$;

create or replace function public.void_order_payment(
  target_shop_id uuid,
  target_payment_id uuid,
  void_reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  if not public.has_shop_role(target_shop_id, array['owner', 'manager']::public.shop_role[]) then
    raise exception 'Only owners and managers can void payments.';
  end if;

  if void_reason is null or char_length(btrim(void_reason)) < 3 then
    raise exception 'A void reason is required.';
  end if;

  update public.payments
  set payment_status = 'voided',
      voided_at = now(),
      voided_by = auth.uid(),
      void_reason = btrim(void_reason)
  where id = target_payment_id
    and shop_id = target_shop_id
    and payment_status = 'completed';

  if not found then
    raise exception 'Completed payment was not found for this shop.';
  end if;

  insert into public.audit_logs (shop_id, user_id, action, entity_type, entity_id, new_data)
  values (target_shop_id, auth.uid(), 'void_order_payment', 'payment', target_payment_id, jsonb_build_object('void_reason', btrim(void_reason)));
end;
$$;

create or replace function public.get_dashboard_metrics(target_shop_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  today date := (now() at time zone 'Asia/Dhaka')::date;
  month_start date := date_trunc('month', now() at time zone 'Asia/Dhaka')::date;
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  if not public.is_active_shop_member(target_shop_id) then
    raise exception 'You are not an active member of this shop.';
  end if;

  select jsonb_build_object(
    'delivery_today', coalesce(count(*) filter (where coalesce(item.item_delivery_date, orders.delivery_date) = today), 0),
    'delivery_tomorrow', coalesce(count(*) filter (where coalesce(item.item_delivery_date, orders.delivery_date) = today + 1), 0),
    'overdue', coalesce(count(*) filter (where coalesce(item.item_delivery_date, orders.delivery_date) < today and item.production_status not in ('delivered', 'cancelled')), 0),
    'cutting', coalesce(count(*) filter (where item.production_status = 'cutting'), 0),
    'stitching', coalesce(count(*) filter (where item.production_status = 'stitching'), 0),
    'finishing', coalesce(count(*) filter (where item.production_status = 'finishing'), 0),
    'ready', coalesce(count(*) filter (where item.production_status = 'ready'), 0),
    'unpaid_balance', coalesce((
      select sum(order_balance.total_amount - order_balance.paid_amount)
      from (
        select order_row.id,
               order_row.total_amount,
               coalesce(sum(payment.amount) filter (where payment.payment_status = 'completed'), 0) as paid_amount
        from public.orders order_row
        left join public.payments payment
          on payment.order_id = order_row.id
         and payment.shop_id = order_row.shop_id
        where order_row.shop_id = target_shop_id
          and order_row.deleted_at is null
        group by order_row.id, order_row.total_amount
      ) order_balance
    ), 0),
    'monthly_order_count', coalesce((
      select count(*)
      from public.orders month_orders
      where month_orders.shop_id = target_shop_id
        and month_orders.deleted_at is null
        and month_orders.order_date >= month_start
    ), 0),
    'monthly_sales', coalesce((
      select sum(payment.amount)
      from public.payments payment
      where payment.shop_id = target_shop_id
        and payment.payment_status = 'completed'
        and (payment.paid_at at time zone 'Asia/Dhaka')::date >= month_start
    ), 0)
  ) into result
  from public.orders orders
  left join public.order_items item
    on item.order_id = orders.id
   and item.shop_id = orders.shop_id
  where orders.shop_id = target_shop_id
    and orders.deleted_at is null;

  return result;
end;
$$;

alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.shop_members enable row level security;
alter table public.shop_counters enable row level security;
alter table public.garment_types enable row level security;
alter table public.measurement_fields enable row level security;
alter table public.style_fields enable row level security;
alter table public.customers enable row level security;
alter table public.measurement_sets enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.order_status_history enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles are visible to owner"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "users can create their own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "users can update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "members can view their shops"
on public.shops for select
to authenticated
using (deleted_at is null and public.is_active_shop_member(id));

create policy "owners and managers can update shops"
on public.shops for update
to authenticated
using (public.has_shop_role(id, array['owner', 'manager']::public.shop_role[]))
with check (public.has_shop_role(id, array['owner', 'manager']::public.shop_role[]));

create policy "members can view shop members"
on public.shop_members for select
to authenticated
using (public.is_active_shop_member(shop_id));

create policy "owners and managers can add shop members"
on public.shop_members for insert
to authenticated
with check (public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[]));

create policy "owners and managers can update other members"
on public.shop_members for update
to authenticated
using (
  public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[])
  and user_id <> auth.uid()
)
with check (
  public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[])
  and user_id <> auth.uid()
);

create policy "owners and managers can view shop counters"
on public.shop_counters for select
to authenticated
using (public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[]));

create policy "members can view garment types"
on public.garment_types for select
to authenticated
using (public.is_active_shop_member(shop_id));

create policy "owners and managers can create garment types"
on public.garment_types for insert
to authenticated
with check (public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[]));

create policy "owners and managers can update garment types"
on public.garment_types for update
to authenticated
using (public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[]))
with check (public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[]));

create policy "members can view measurement fields"
on public.measurement_fields for select
to authenticated
using (public.is_active_shop_member(shop_id));

create policy "owners and managers can create measurement fields"
on public.measurement_fields for insert
to authenticated
with check (public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[]));

create policy "owners and managers can update measurement fields"
on public.measurement_fields for update
to authenticated
using (public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[]))
with check (public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[]));

create policy "members can view style fields"
on public.style_fields for select
to authenticated
using (public.is_active_shop_member(shop_id));

create policy "owners and managers can create style fields"
on public.style_fields for insert
to authenticated
with check (public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[]));

create policy "owners and managers can update style fields"
on public.style_fields for update
to authenticated
using (public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[]))
with check (public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[]));

create policy "members can view customers"
on public.customers for select
to authenticated
using (public.is_active_shop_member(shop_id));

create policy "staff can create customers"
on public.customers for insert
to authenticated
with check (public.has_shop_role(shop_id, array['owner', 'manager', 'staff']::public.shop_role[]));

create policy "staff can update customers"
on public.customers for update
to authenticated
using (public.has_shop_role(shop_id, array['owner', 'manager', 'staff']::public.shop_role[]))
with check (public.has_shop_role(shop_id, array['owner', 'manager', 'staff']::public.shop_role[]));

create policy "members can view measurement sets"
on public.measurement_sets for select
to authenticated
using (public.is_active_shop_member(shop_id));

create policy "measurement roles can create measurement sets"
on public.measurement_sets for insert
to authenticated
with check (public.has_shop_role(shop_id, array['owner', 'manager', 'staff', 'cutter', 'tailor']::public.shop_role[]));

create policy "members can view orders"
on public.orders for select
to authenticated
using (public.is_active_shop_member(shop_id));

create policy "staff roles can create orders"
on public.orders for insert
to authenticated
with check (public.has_shop_role(shop_id, array['owner', 'manager', 'staff']::public.shop_role[]));

create policy "staff roles can update orders"
on public.orders for update
to authenticated
using (public.has_shop_role(shop_id, array['owner', 'manager', 'staff']::public.shop_role[]))
with check (public.has_shop_role(shop_id, array['owner', 'manager', 'staff']::public.shop_role[]));

create policy "members can view order items"
on public.order_items for select
to authenticated
using (public.is_active_shop_member(shop_id));

create policy "staff roles can create order items"
on public.order_items for insert
to authenticated
with check (public.has_shop_role(shop_id, array['owner', 'manager', 'staff']::public.shop_role[]));

create policy "staff can update order items"
on public.order_items for update
to authenticated
using (public.has_shop_role(shop_id, array['owner', 'manager', 'staff']::public.shop_role[]))
with check (public.has_shop_role(shop_id, array['owner', 'manager', 'staff']::public.shop_role[]));

create policy "assigned production users can update order items"
on public.order_items for update
to authenticated
using (
  public.has_shop_role(shop_id, array['cutter', 'tailor']::public.shop_role[])
  and assigned_to = auth.uid()
)
with check (
  public.has_shop_role(shop_id, array['cutter', 'tailor']::public.shop_role[])
  and assigned_to = auth.uid()
);

create policy "members can view payments"
on public.payments for select
to authenticated
using (public.is_active_shop_member(shop_id));

create policy "payment roles can create payments"
on public.payments for insert
to authenticated
with check (public.has_shop_role(shop_id, array['owner', 'manager', 'staff']::public.shop_role[]));

create policy "owners and managers can void payments"
on public.payments for update
to authenticated
using (public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[]))
with check (public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[]));

create policy "members can view order status history"
on public.order_status_history for select
to authenticated
using (public.is_active_shop_member(shop_id));

create policy "owners and managers can view audit logs"
on public.audit_logs for select
to authenticated
using (public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[]));

revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;
revoke all on all sequences in schema public from anon;

revoke all on all tables in schema public from authenticated;
revoke all on all functions in schema public from authenticated;
revoke all on all sequences in schema public from authenticated;

revoke all on all tables in schema public from public;
revoke all on all functions in schema public from public;
revoke all on all sequences in schema public from public;

grant usage on schema public to authenticated;

grant usage on type public.shop_role to authenticated;
grant usage on type public.measurement_unit to authenticated;
grant usage on type public.measurement_field_type to authenticated;
grant usage on type public.style_field_type to authenticated;
grant usage on type public.order_priority to authenticated;
grant usage on type public.order_status to authenticated;
grant usage on type public.production_status to authenticated;
grant usage on type public.payment_method to authenticated;
grant usage on type public.payment_status to authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, update on public.shops to authenticated;
grant select, insert, update on public.shop_members to authenticated;
grant select on public.shop_counters to authenticated;
grant select, insert, update on public.garment_types to authenticated;
grant select, insert, update on public.measurement_fields to authenticated;
grant select, insert, update on public.style_fields to authenticated;
grant select, insert, update on public.customers to authenticated;

-- Sensitive business mutations below are intentionally routed through SECURITY DEFINER RPCs.
-- Direct table writes are not granted because totals, due amounts, snapshots, and status transitions
-- must be recalculated and validated inside PostgreSQL.
grant select on public.measurement_sets to authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select on public.payments to authenticated;
grant select on public.order_status_history to authenticated;
grant select on public.audit_logs to authenticated;

grant execute on function public.normalize_phone(text) to authenticated;
grant execute on function public.normalize_search_name(text) to authenticated;
grant execute on function public.is_active_shop_member(uuid, uuid) to authenticated;
grant execute on function public.has_shop_role(uuid, public.shop_role[], uuid) to authenticated;
grant execute on function public.current_user_shop_ids() to authenticated;
grant execute on function public.create_shop_with_owner(text, text, text, text, text, text) to authenticated;
grant execute on function public.create_measurement_version(uuid, uuid, uuid, public.measurement_unit, jsonb, text) to authenticated;
grant execute on function public.create_order_with_items(uuid, uuid, jsonb) to authenticated;
grant execute on function public.record_order_payment(uuid, uuid, numeric, public.payment_method, text, text, boolean) to authenticated;
grant execute on function public.change_order_item_status(uuid, uuid, public.production_status, text) to authenticated;
grant execute on function public.void_order_payment(uuid, uuid, text) to authenticated;
grant execute on function public.get_dashboard_metrics(uuid) to authenticated;

commit;
