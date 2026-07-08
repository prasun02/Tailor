-- Tailor order workflow helpers.
-- Adds secure delivery confirmation and expanded dashboard metrics without changing existing tables.

begin;

create or replace function public.confirm_order_delivery(
  target_shop_id uuid,
  target_order_item_id uuid,
  delivery_note text default null
)
returns public.order_items
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_item public.order_items;
  updated_item public.order_items;
  order_total numeric(12, 2);
  paid_total numeric(12, 2);
  due_total numeric(12, 2);
  total_items integer;
  delivered_items integer;
  ready_or_delivered_items integer;
  cancelled_items integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  if not public.has_shop_role(target_shop_id, array['owner', 'manager', 'staff']::public.shop_role[]) then
    raise exception 'Only owners, managers, and staff can confirm delivery.';
  end if;

  select * into existing_item
  from public.order_items item
  where item.id = target_order_item_id
    and item.shop_id = target_shop_id;

  if existing_item.id is null then
    raise exception 'Order item was not found for this shop.';
  end if;

  if existing_item.production_status = 'delivered' then
    return existing_item;
  end if;

  if existing_item.production_status <> 'ready' then
    raise exception 'Only ready items can be delivered.';
  end if;

  select orders.total_amount into order_total
  from public.orders orders
  where orders.id = existing_item.order_id
    and orders.shop_id = target_shop_id
    and orders.deleted_at is null;

  if order_total is null then
    raise exception 'Order was not found for this shop.';
  end if;

  select coalesce(sum(payments.amount), 0) into paid_total
  from public.payments payments
  where payments.shop_id = target_shop_id
    and payments.order_id = existing_item.order_id
    and payments.payment_status = 'completed';

  due_total := order_total - paid_total;

  if due_total > 0 then
    raise exception 'Due amount must be paid before delivery.';
  end if;

  update public.order_items
  set production_status = 'delivered'
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
    updated_item.production_status::text,
    nullif(btrim(delivery_note), ''),
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
    'confirm_order_delivery',
    'order_item',
    updated_item.id,
    jsonb_build_object('production_status', existing_item.production_status, 'due_amount', due_total),
    jsonb_build_object('production_status', updated_item.production_status)
  );

  return updated_item;
end;
$$;

create or replace function public.get_tailor_dashboard_metrics(target_shop_id uuid)
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
    'new_orders_today', coalesce(count(distinct orders.id) filter (where orders.order_date = today), 0),
    'delivery_today', coalesce(count(*) filter (where coalesce(item.item_delivery_date, orders.delivery_date) = today and item.production_status not in ('delivered', 'cancelled')), 0),
    'delivery_tomorrow', coalesce(count(*) filter (where coalesce(item.item_delivery_date, orders.delivery_date) = today + 1 and item.production_status not in ('delivered', 'cancelled')), 0),
    'overdue_orders', coalesce(count(distinct orders.id) filter (where coalesce(item.item_delivery_date, orders.delivery_date) < today and item.production_status not in ('delivered', 'cancelled')), 0),
    'ready_for_delivery', coalesce(count(*) filter (where item.production_status = 'ready'), 0),
    'items_in_cutting', coalesce(count(*) filter (where item.production_status = 'cutting'), 0),
    'items_in_stitching', coalesce(count(*) filter (where item.production_status = 'stitching'), 0),
    'items_in_finishing', coalesce(count(*) filter (where item.production_status = 'finishing'), 0),
    'total_due_amount', coalesce((
      select sum(greatest(order_balance.total_amount - order_balance.paid_amount, 0))
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
    'sales_this_month', coalesce((
      select sum(payment.amount)
      from public.payments payment
      where payment.shop_id = target_shop_id
        and payment.payment_status = 'completed'
        and (payment.paid_at at time zone 'Asia/Dhaka')::date >= month_start
    ), 0),
    'orders_this_month', coalesce((
      select count(*)
      from public.orders month_orders
      where month_orders.shop_id = target_shop_id
        and month_orders.deleted_at is null
        and month_orders.order_date >= month_start
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

revoke all on function public.confirm_order_delivery(uuid, uuid, text) from public;
revoke all on function public.confirm_order_delivery(uuid, uuid, text) from anon;
grant execute on function public.confirm_order_delivery(uuid, uuid, text) to authenticated;

revoke all on function public.get_tailor_dashboard_metrics(uuid) from public;
revoke all on function public.get_tailor_dashboard_metrics(uuid) from anon;
grant execute on function public.get_tailor_dashboard_metrics(uuid) to authenticated;

comment on function public.confirm_order_delivery(uuid, uuid, text)
  is 'Confirms delivery for a ready order item only after completed payments cover the order total.';

comment on function public.get_tailor_dashboard_metrics(uuid)
  is 'Returns compact shop dashboard metrics for the tailor order-entry workflow.';

notify pgrst, 'reload schema';

commit;
