-- Repair and extend the tailor dashboard metrics RPC expected by the frontend.
-- This migration is safe to run after earlier migrations and refreshes PostgREST schema cache.

begin;

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

  if target_shop_id is null then
    raise exception 'Shop id is required.';
  end if;

  if not public.is_active_shop_member(target_shop_id, auth.uid()) then
    raise exception 'You are not an active member of this shop.';
  end if;

  with order_scope as (
    select orders.*
    from public.orders orders
    where orders.shop_id = target_shop_id
      and orders.deleted_at is null
  ),
  item_scope as (
    select item.*,
           coalesce(item.item_delivery_date, orders.delivery_date) as effective_delivery_date
    from public.order_items item
    join order_scope orders
      on orders.id = item.order_id
     and orders.shop_id = item.shop_id
  ),
  order_balance as (
    select orders.id,
           orders.total_amount,
           coalesce(sum(payment.amount) filter (where payment.payment_status = 'completed'), 0) as paid_amount
    from order_scope orders
    left join public.payments payment
      on payment.order_id = orders.id
     and payment.shop_id = orders.shop_id
    group by orders.id, orders.total_amount
  )
  select jsonb_build_object(
    'new_orders_today', coalesce((select count(*) from order_scope where order_date = today), 0),
    'orders_today', coalesce((select count(*) from order_scope where order_date = today), 0),
    'delivery_today', coalesce((select count(*) from item_scope where effective_delivery_date = today and production_status not in ('delivered', 'cancelled')), 0),
    'deliveries_today', coalesce((select count(*) from item_scope where effective_delivery_date = today and production_status not in ('delivered', 'cancelled')), 0),
    'delivery_tomorrow', coalesce((select count(*) from item_scope where effective_delivery_date = today + 1 and production_status not in ('delivered', 'cancelled')), 0),
    'deliveries_tomorrow', coalesce((select count(*) from item_scope where effective_delivery_date = today + 1 and production_status not in ('delivered', 'cancelled')), 0),
    'overdue_orders', coalesce((select count(distinct order_id) from item_scope where effective_delivery_date < today and production_status not in ('delivered', 'cancelled')), 0),
    'ready_for_delivery', coalesce((select count(*) from item_scope where production_status = 'ready'), 0),
    'items_in_cutting', coalesce((select count(*) from item_scope where production_status = 'cutting'), 0),
    'cutting_count', coalesce((select count(*) from item_scope where production_status = 'cutting'), 0),
    'items_in_stitching', coalesce((select count(*) from item_scope where production_status = 'stitching'), 0),
    'stitching_count', coalesce((select count(*) from item_scope where production_status = 'stitching'), 0),
    'items_in_finishing', coalesce((select count(*) from item_scope where production_status = 'finishing'), 0),
    'finishing_count', coalesce((select count(*) from item_scope where production_status = 'finishing'), 0),
    'production_active_count', coalesce((select count(*) from item_scope where production_status not in ('delivered', 'cancelled')), 0),
    'total_due_amount', coalesce((select sum(greatest(total_amount - paid_amount, 0)) from order_balance), 0),
    'sales_this_month', coalesce((
      select sum(payment.amount)
      from public.payments payment
      where payment.shop_id = target_shop_id
        and payment.payment_status = 'completed'
        and (payment.paid_at at time zone 'Asia/Dhaka')::date >= month_start
    ), 0),
    'monthly_sales', coalesce((
      select sum(payment.amount)
      from public.payments payment
      where payment.shop_id = target_shop_id
        and payment.payment_status = 'completed'
        and (payment.paid_at at time zone 'Asia/Dhaka')::date >= month_start
    ), 0),
    'orders_this_month', coalesce((select count(*) from order_scope where order_date >= month_start), 0),
    'monthly_order_count', coalesce((select count(*) from order_scope where order_date >= month_start), 0),
    'customer_count', coalesce((
      select count(*)
      from public.customers customer
      where customer.shop_id = target_shop_id
        and customer.is_active = true
        and customer.deleted_at is null
    ), 0)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_tailor_dashboard_metrics(uuid) from public;
revoke all on function public.get_tailor_dashboard_metrics(uuid) from anon;
grant execute on function public.get_tailor_dashboard_metrics(uuid) to authenticated;

comment on function public.get_tailor_dashboard_metrics(uuid)
  is 'Returns shop-scoped dashboard metrics for authenticated active shop members.';

notify pgrst, 'reload schema';

commit;
