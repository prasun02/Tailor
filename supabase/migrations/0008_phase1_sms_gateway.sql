-- Phase 1 SMS gateway support.
-- Secrets stay in Supabase Edge Function secrets; frontend stores no provider keys.

begin;

create table if not exists public.sms_templates (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  template_key text not null,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sms_templates_key_check check (template_key in ('order_confirmed', 'order_ready', 'delivered')),
  constraint sms_templates_body_length_check check (char_length(btrim(body)) between 10 and 500),
  unique (shop_id, template_key)
);

create table if not exists public.sms_logs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  template_key text not null,
  recipient_phone text,
  message_body text not null,
  provider_name text,
  provider_message_id text,
  status text not null default 'queued',
  error_message text,
  requested_by uuid references auth.users(id) on delete set null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sms_logs_template_key_check check (template_key in ('order_confirmed', 'order_ready', 'delivered')),
  constraint sms_logs_status_check check (status in ('queued', 'sent', 'failed', 'skipped')),
  constraint sms_logs_message_body_length_check check (char_length(btrim(message_body)) between 1 and 500)
);

create index if not exists sms_templates_shop_key_idx on public.sms_templates (shop_id, template_key);
create index if not exists sms_logs_shop_order_created_idx on public.sms_logs (shop_id, order_id, created_at desc);
create index if not exists sms_logs_shop_status_idx on public.sms_logs (shop_id, status, created_at desc);

drop trigger if exists sms_templates_set_updated_at on public.sms_templates;
create trigger sms_templates_set_updated_at
before update on public.sms_templates
for each row execute function public.set_updated_at();

drop trigger if exists sms_logs_set_updated_at on public.sms_logs;
create trigger sms_logs_set_updated_at
before update on public.sms_logs
for each row execute function public.set_updated_at();

alter table public.sms_templates enable row level security;
alter table public.sms_logs enable row level security;

drop policy if exists "active members can view sms templates" on public.sms_templates;
create policy "active members can view sms templates"
on public.sms_templates for select
to authenticated
using (public.is_active_shop_member(shop_id));

drop policy if exists "owners and managers can insert sms templates" on public.sms_templates;
create policy "owners and managers can insert sms templates"
on public.sms_templates for insert
to authenticated
with check (public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[]));

drop policy if exists "owners and managers can update sms templates" on public.sms_templates;
create policy "owners and managers can update sms templates"
on public.sms_templates for update
to authenticated
using (public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[]))
with check (public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[]));

drop policy if exists "owners and managers can delete sms templates" on public.sms_templates;
create policy "owners and managers can delete sms templates"
on public.sms_templates for delete
to authenticated
using (public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[]));

drop policy if exists "active members can view sms logs" on public.sms_logs;
create policy "active members can view sms logs"
on public.sms_logs for select
to authenticated
using (public.is_active_shop_member(shop_id));

create or replace function public.default_sms_template_body(template_key text)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  case template_key
    when 'order_confirmed' then
      return 'Dear {{customer_name}}, your Faabrico order {{order_number}} is confirmed. Delivery: {{delivery_date}}. Advance: BDT {{advance_amount}}, due: BDT {{due_amount}}. Call {{shop_phone}}.';
    when 'order_ready' then
      return 'Dear {{customer_name}}, your Faabrico order {{order_number}} is ready for delivery. Due: BDT {{due_amount}}. Call {{shop_phone}}.';
    when 'delivered' then
      return 'Dear {{customer_name}}, your Faabrico order {{order_number}} has been delivered. Thank you. Call {{shop_phone}} for support.';
    else
      raise exception 'Unsupported SMS template key.';
  end case;
end;
$$;

create or replace function public.seed_sms_templates_for_shop(target_shop_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if target_shop_id is null then
    raise exception 'target_shop_id is required.';
  end if;

  insert into public.sms_templates (shop_id, template_key, body)
  values
    (target_shop_id, 'order_confirmed', public.default_sms_template_body('order_confirmed')),
    (target_shop_id, 'order_ready', public.default_sms_template_body('order_ready')),
    (target_shop_id, 'delivered', public.default_sms_template_body('delivered'))
  on conflict (shop_id, template_key) do nothing;
end;
$$;

create or replace function public.seed_sms_templates_after_shop_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.seed_sms_templates_for_shop(new.id);
  return new;
end;
$$;

drop trigger if exists shops_seed_sms_templates on public.shops;
create trigger shops_seed_sms_templates
after insert on public.shops
for each row execute function public.seed_sms_templates_after_shop_insert();

select public.seed_sms_templates_for_shop(id)
from public.shops
where deleted_at is null;

create or replace function public.render_sms_template(template_body text, variables jsonb)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  rendered text;
begin
  rendered := coalesce(template_body, '');
  rendered := replace(rendered, '{{customer_name}}', coalesce(variables->>'customer_name', 'Customer'));
  rendered := replace(rendered, '{{order_number}}', coalesce(variables->>'order_number', ''));
  rendered := replace(rendered, '{{delivery_date}}', coalesce(variables->>'delivery_date', ''));
  rendered := replace(rendered, '{{advance_amount}}', coalesce(variables->>'advance_amount', '0'));
  rendered := replace(rendered, '{{due_amount}}', coalesce(variables->>'due_amount', '0'));
  rendered := replace(rendered, '{{shop_phone}}', coalesce(variables->>'shop_phone', ''));
  return rendered;
end;
$$;

create or replace function public.request_order_sms(
  target_shop_id uuid,
  target_order_id uuid,
  target_template_key text
)
returns table (
  log_id uuid,
  recipient_phone text,
  message_body text,
  provider_name text,
  should_send boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  order_record public.orders%rowtype;
  customer_record public.customers%rowtype;
  shop_record public.shops%rowtype;
  template_record public.sms_templates%rowtype;
  paid_amount numeric := 0;
  due_amount numeric := 0;
  rendered_message text;
  normalized_recipient text;
  inserted_log_id uuid;
  log_status text := 'queued';
  log_error text := null;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if target_shop_id is null or target_order_id is null then
    raise exception 'Shop and order are required.';
  end if;

  if target_template_key not in ('order_confirmed', 'order_ready', 'delivered') then
    raise exception 'Unsupported SMS template key.';
  end if;

  if not public.has_shop_role(target_shop_id, array['owner', 'manager', 'staff']::public.shop_role[], current_user_id) then
    raise exception 'You do not have permission to send SMS for this shop.';
  end if;

  select * into order_record
  from public.orders
  where id = target_order_id
    and shop_id = target_shop_id
    and deleted_at is null;

  if not found then
    raise exception 'Order not found.';
  end if;

  select * into customer_record
  from public.customers
  where id = order_record.customer_id
    and shop_id = target_shop_id
    and deleted_at is null;

  if not found then
    raise exception 'Customer not found.';
  end if;

  select * into shop_record
  from public.shops
  where id = target_shop_id
    and deleted_at is null;

  if not found then
    raise exception 'Shop not found.';
  end if;

  select * into template_record
  from public.sms_templates
  where shop_id = target_shop_id
    and template_key = target_template_key
    and is_active = true;

  if not found then
    raise exception 'Active SMS template not found.';
  end if;

  select coalesce(sum(amount), 0) into paid_amount
  from public.payments
  where shop_id = target_shop_id
    and order_id = target_order_id
    and payment_status = 'completed';

  due_amount := greatest(order_record.total_amount - paid_amount, 0);
  rendered_message := public.render_sms_template(
    template_record.body,
    jsonb_build_object(
      'customer_name', customer_record.name,
      'order_number', order_record.order_number,
      'delivery_date', coalesce(order_record.delivery_date::text, 'Not set'),
      'advance_amount', paid_amount::text,
      'due_amount', due_amount::text,
      'shop_phone', coalesce(shop_record.phone, '+880 1714-793555')
    )
  );
  normalized_recipient := nullif(btrim(coalesce(customer_record.phone, '')), '');

  if normalized_recipient is null then
    log_status := 'skipped';
    log_error := 'Customer phone is not set.';
  end if;

  insert into public.sms_logs (
    shop_id,
    order_id,
    customer_id,
    template_key,
    recipient_phone,
    message_body,
    provider_name,
    status,
    error_message,
    requested_by
  )
  values (
    target_shop_id,
    target_order_id,
    customer_record.id,
    target_template_key,
    normalized_recipient,
    rendered_message,
    nullif(current_setting('app.sms_provider_name', true), ''),
    log_status,
    log_error,
    current_user_id
  )
  returning id into inserted_log_id;

  return query select
    inserted_log_id,
    normalized_recipient,
    rendered_message,
    nullif(current_setting('app.sms_provider_name', true), ''),
    log_status = 'queued';
end;
$$;

create or replace function public.record_sms_delivery_result(
  target_log_id uuid,
  delivery_status text,
  target_provider_name text default null,
  target_provider_message_id text default null,
  target_error_message text default null
)
returns public.sms_logs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  log_record public.sms_logs%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if delivery_status not in ('sent', 'failed', 'skipped') then
    raise exception 'Invalid SMS delivery status.';
  end if;

  select * into log_record
  from public.sms_logs
  where id = target_log_id;

  if not found then
    raise exception 'SMS log not found.';
  end if;

  if not public.has_shop_role(log_record.shop_id, array['owner', 'manager', 'staff']::public.shop_role[], current_user_id) then
    raise exception 'You do not have permission to update SMS logs for this shop.';
  end if;

  update public.sms_logs
  set
    status = delivery_status,
    provider_name = coalesce(nullif(btrim(target_provider_name), ''), provider_name),
    provider_message_id = nullif(btrim(target_provider_message_id), ''),
    error_message = nullif(btrim(target_error_message), ''),
    sent_at = case when delivery_status = 'sent' then now() else sent_at end
  where id = target_log_id
  returning * into log_record;

  return log_record;
end;
$$;

revoke all on function public.default_sms_template_body(text) from public;
revoke all on function public.seed_sms_templates_for_shop(uuid) from public;
revoke all on function public.seed_sms_templates_after_shop_insert() from public;
revoke all on function public.render_sms_template(text, jsonb) from public;
revoke all on function public.request_order_sms(uuid, uuid, text) from public;
revoke all on function public.record_sms_delivery_result(uuid, text, text, text, text) from public;

grant execute on function public.default_sms_template_body(text) to authenticated;
grant execute on function public.request_order_sms(uuid, uuid, text) to authenticated;
grant execute on function public.record_sms_delivery_result(uuid, text, text, text, text) to authenticated;

grant select, insert, update, delete on public.sms_templates to authenticated;
grant select on public.sms_logs to authenticated;

comment on table public.sms_logs is 'Append-only SMS send attempts requested by authenticated shop members and delivered through Supabase Edge Functions.';
comment on function public.request_order_sms(uuid, uuid, text) is 'Validates shop membership, renders an order SMS template, and queues an SMS log without exposing SMS provider secrets to the frontend.';
comment on function public.record_sms_delivery_result(uuid, text, text, text, text) is 'Records provider delivery result from the authenticated Edge Function flow.';

commit;
