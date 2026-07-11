-- Design library and immutable order design snapshots.
-- Creates shop-scoped garment designs and stores selected design/fabric data on order items.

begin;

create table public.garment_designs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  garment_type_id uuid not null references public.garment_types(id) on delete restrict,
  design_name text not null check (char_length(btrim(design_name)) between 2 and 120),
  design_code text not null check (design_code ~ '^[A-Z0-9_]{2,40}$'),
  style_category text,
  preview_image_url text,
  preview_video_url text,
  cloth_reference_url text,
  tags text[] not null default '{}'::text[],
  description text,
  style_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(style_metadata) = 'object'),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.order_items
  add column design_id uuid references public.garment_designs(id) on delete set null,
  add column design_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(design_snapshot) = 'object'),
  add column fabric_reference_url text,
  add column preview_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(preview_summary) = 'object'),
  add column preview_video_url text;

create index garment_designs_shop_id_idx
  on public.garment_designs (shop_id);

create index garment_designs_garment_type_id_idx
  on public.garment_designs (garment_type_id);

create index garment_designs_is_active_idx
  on public.garment_designs (is_active);

create index garment_designs_design_code_idx
  on public.garment_designs (design_code);

create index garment_designs_style_category_idx
  on public.garment_designs (style_category);

create index garment_designs_sort_order_idx
  on public.garment_designs (sort_order);

create index garment_designs_shop_garment_active_sort_idx
  on public.garment_designs (shop_id, garment_type_id, is_active, sort_order)
  where deleted_at is null;

create unique index garment_designs_active_code_per_shop_idx
  on public.garment_designs (shop_id, design_code)
  where is_active = true and deleted_at is null;

create index order_items_design_idx
  on public.order_items (shop_id, design_id)
  where design_id is not null;

create trigger garment_designs_set_updated_at
before update on public.garment_designs
for each row execute function public.set_updated_at();

alter table public.garment_designs enable row level security;

create policy "active members can view active garment designs"
on public.garment_designs for select
to authenticated
using (
  public.is_active_shop_member(shop_id)
  and is_active = true
  and deleted_at is null
);

create policy "owners and managers can view all garment designs"
on public.garment_designs for select
to authenticated
using (public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[]));

create policy "owners and managers can create garment designs"
on public.garment_designs for insert
to authenticated
with check (
  public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[])
  and created_by = auth.uid()
  and exists (
    select 1
    from public.garment_types garment
    where garment.id = garment_type_id
      and garment.shop_id = garment_designs.shop_id
      and garment.deleted_at is null
      and garment.is_active = true
  )
);

create policy "owners and managers can update garment designs"
on public.garment_designs for update
to authenticated
using (public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[]))
with check (
  public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[])
  and exists (
    select 1
    from public.garment_types garment
    where garment.id = garment_type_id
      and garment.shop_id = garment_designs.shop_id
      and garment.deleted_at is null
      and garment.is_active = true
  )
);

grant select, insert, update on public.garment_designs to authenticated;

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
  item_design_id uuid;
  item_quantity integer;
  item_unit_price numeric(12, 2);
  item_status public.production_status;
  item_style_snapshot jsonb;
  item_measurement_snapshot jsonb;
  item_design_snapshot jsonb;
  item_preview_summary jsonb;
  item_fabric_reference_url text;
  item_design_reference_url text;
  item_preview_video_url text;
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
    item_design_id := nullif(item_payload->>'design_id', '')::uuid;

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

    if item_design_id is not null and not exists (
      select 1 from public.garment_designs design
      where design.id = item_design_id
        and design.shop_id = target_shop_id
        and design.garment_type_id = item_garment_id
        and design.deleted_at is null
        and design.is_active = true
    ) then
      raise exception 'Selected design was not found for this shop and garment.';
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
    item_design_id := nullif(item_payload->>'design_id', '')::uuid;
    item_status := coalesce(nullif(item_payload->>'production_status', '')::public.production_status, 'order_received');
    item_style_snapshot := coalesce(item_payload->'style_snapshot', '{}'::jsonb);
    item_design_snapshot := coalesce(item_payload->'design_snapshot', '{}'::jsonb);
    item_preview_summary := coalesce(item_payload->'preview_summary', '{}'::jsonb);
    item_design_reference_url := nullif(btrim(item_payload->>'design_reference_url'), '');
    item_fabric_reference_url := nullif(btrim(item_payload->>'fabric_reference_url'), '');
    item_preview_video_url := nullif(btrim(item_payload->>'preview_video_url'), '');

    if jsonb_typeof(item_style_snapshot) <> 'object' then
      raise exception 'Style snapshot must be a JSON object.';
    end if;

    if jsonb_typeof(item_design_snapshot) <> 'object' then
      raise exception 'Design snapshot must be a JSON object.';
    end if;

    if jsonb_typeof(item_preview_summary) <> 'object' then
      raise exception 'Preview summary must be a JSON object.';
    end if;

    select garment.name into item_garment_name
    from public.garment_types garment
    where garment.id = item_garment_id and garment.shop_id = target_shop_id;

    if item_design_id is not null and item_design_snapshot = '{}'::jsonb then
      select jsonb_build_object(
        'id', design.id,
        'design_name', design.design_name,
        'design_code', design.design_code,
        'name', design.design_name,
        'code', design.design_code,
        'description', design.description,
        'style_category', design.style_category,
        'preview_image_url', design.preview_image_url,
        'preview_video_url', design.preview_video_url,
        'cloth_reference_url', design.cloth_reference_url,
        'style_metadata', design.style_metadata,
        'tags', to_jsonb(design.tags)
      )
      into item_design_snapshot
      from public.garment_designs design
      where design.id = item_design_id
        and design.shop_id = target_shop_id;
    end if;

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
      design_reference_url,
      design_id,
      design_snapshot,
      fabric_reference_url,
      preview_summary,
      preview_video_url
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
      item_design_reference_url,
      item_design_id,
      item_design_snapshot,
      item_fabric_reference_url,
      item_preview_summary,
      item_preview_video_url
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
      raise exception 'Advance payment cannot exceed order total.';
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
        'Advance payment at order creation',
        now(),
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

revoke all on function public.create_order_with_items(uuid, uuid, jsonb) from public;
revoke all on function public.create_order_with_items(uuid, uuid, jsonb) from anon;
grant execute on function public.create_order_with_items(uuid, uuid, jsonb) to authenticated;

comment on table public.garment_designs is 'Shop-scoped design catalog used for customer-friendly order style selection.';
comment on column public.order_items.design_snapshot is 'Immutable copy of selected garment design details at order confirmation time.';
comment on column public.order_items.fabric_reference_url is 'Customer cloth or fabric reference image URL kept separate from garment design style.';
comment on column public.order_items.preview_summary is 'Immutable practical preview summary shown to customers before confirmation.';

notify pgrst, 'reload schema';

commit;
