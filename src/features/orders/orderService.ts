import { addDays, format } from 'date-fns';
import type { Json, PaymentMethod, ProductionStatus, ShopRole } from '../../types/database';
import { getSupabaseClient } from '../../services/supabaseClient';
import { buildCustomerSearchOrFilter } from '../customers/customerService';
import { escapePostgrestPattern, normalizeCustomerSearch } from '../customers/search';
import type { CreateOrderPayload } from './orderPayload';
import { asJsonPayload } from './orderPayload';
import type { OrderEditValues, OrderListFilters, PaymentFormValues } from './orderSchemas';

export type { CreateOrderPayload } from './orderPayload';

type Db = import('../../types/database').Database;
type OrderRow = Db['public']['Tables']['orders']['Row'];
type OrderItemRow = Db['public']['Tables']['order_items']['Row'];
type PaymentRow = Db['public']['Tables']['payments']['Row'];
type OrderStatusHistoryRow = Db['public']['Tables']['order_status_history']['Row'];
type CustomerRow = Db['public']['Tables']['customers']['Row'];
type MeasurementSetRow = Db['public']['Tables']['measurement_sets']['Row'];
type GarmentTypeRow = Db['public']['Tables']['garment_types']['Row'];

const ORDER_SELECT =
  'id, shop_id, order_number, customer_id, order_date, trial_date, delivery_date, priority, overall_status, subtotal, discount_amount, total_amount, notes, created_by, delivered_at, created_at, updated_at, deleted_at';
const ORDER_ITEM_SELECT =
  'id, shop_id, order_id, garment_type_id, garment_name_snapshot, quantity, unit_price, line_total, measurement_set_id, measurement_snapshot, style_snapshot, special_instructions, assigned_to, production_status, item_delivery_date, design_reference_url, created_at, updated_at';
const PAYMENT_SELECT =
  'id, shop_id, order_id, amount, payment_method, payment_status, reference, notes, paid_at, received_by, voided_at, voided_by, void_reason, created_at';
const CUSTOMER_SELECT =
  'id, shop_id, customer_code, name, normalized_name, phone, normalized_phone, alternative_phone, address, notes, is_active, created_by, created_at, updated_at, deleted_at';
const HISTORY_SELECT = 'id, shop_id, order_id, order_item_id, previous_status, new_status, note, changed_by, changed_at';
const MEASUREMENT_SELECT =
  'id, shop_id, customer_id, garment_type_id, version_number, unit, values, notes, measured_at, measured_by, is_current, created_at';
const GARMENT_SELECT = 'id, shop_id, name, name_bn, code, description, sort_order, is_active, created_at, updated_at, deleted_at';

export type OrderFinancialSummary = {
  totalPaid: number;
  dueAmount: number;
  paymentState: 'unpaid' | 'partial' | 'paid' | 'overpaid';
};

export type OrderListItem = OrderRow &
  OrderFinancialSummary & {
    customer: Pick<CustomerRow, 'id' | 'name' | 'phone' | 'customer_code'> | null;
    itemCount: number;
    productionStatuses: ProductionStatus[];
  };

export type OrderListResult = {
  orders: OrderListItem[];
  count: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type OrderDetail = {
  order: OrderRow;
  customer: CustomerRow | null;
  items: OrderItemRow[];
  payments: PaymentRow[];
  statusHistory: OrderStatusHistoryRow[];
  financial: OrderFinancialSummary;
};

export type OrderWizardContext = {
  garments: GarmentTypeRow[];
  members: Array<{ user_id: string; role: ShopRole }>;
};

export type DashboardMetrics = {
  newOrdersToday: number;
  deliveryToday: number;
  deliveryTomorrow: number;
  overdueOrders: number;
  readyForDelivery: number;
  itemsInCutting: number;
  itemsInStitching: number;
  itemsInFinishing: number;
  totalDueAmount: number;
  salesThisMonth: number;
  ordersThisMonth: number;
};

export type ProductionItem = OrderItemRow & {
  order: Pick<OrderRow, 'id' | 'order_number' | 'order_date' | 'delivery_date' | 'overall_status' | 'total_amount'> | null;
  customer: Pick<CustomerRow, 'id' | 'name' | 'phone' | 'customer_code'> | null;
  financial: OrderFinancialSummary;
  dueDate: string | null;
  isOverdue: boolean;
};

export type DeliverySections = {
  ready: ProductionItem[];
  today: ProductionItem[];
  tomorrow: ProductionItem[];
  overdue: ProductionItem[];
  delivered: ProductionItem[];
};

export type DashboardWorklists = {
  nextDeliveries: OrderListItem[];
  readyItems: ProductionItem[];
  overdueOrders: OrderListItem[];
  recentOrders: OrderListItem[];
  dueOrders: OrderListItem[];
};

export type CreateOrderResult = {
  order: OrderRow;
  items: OrderItemRow[];
  payments: PaymentRow[];
};

export type RecordPaymentResult = {
  payment_id: string;
  total_paid: number;
  due_amount: number;
};

function toNumber(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function summaryFor(order: OrderRow, payments: PaymentRow[]): OrderFinancialSummary {
  const totalPaid = payments
    .filter((payment) => payment.payment_status === 'completed')
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const dueAmount = Number(order.total_amount) - totalPaid;
  const paymentState = totalPaid <= 0 ? 'unpaid' : dueAmount > 0 ? 'partial' : dueAmount === 0 ? 'paid' : 'overpaid';

  return { totalPaid, dueAmount, paymentState };
}

function hydrateOrders(orders: OrderRow[], customers: CustomerRow[], items: OrderItemRow[], payments: PaymentRow[]): OrderListItem[] {
  const customersById = new Map(customers.map((customer) => [customer.id, customer]));

  return orders.map((order) => {
    const orderItems = items.filter((item) => item.order_id === order.id);
    const orderPayments = payments.filter((payment) => payment.order_id === order.id);
    const customer = customersById.get(order.customer_id) ?? null;

    return {
      ...order,
      ...summaryFor(order, orderPayments),
      customer: customer
        ? { id: customer.id, name: customer.name, phone: customer.phone, customer_code: customer.customer_code }
        : null,
      itemCount: orderItems.length,
      productionStatuses: Array.from(new Set(orderItems.map((item) => item.production_status))),
    };
  });
}

async function loadOrderRelations(shopId: string, orders: OrderRow[]) {
  const supabase = getSupabaseClient();
  const orderIds = orders.map((order) => order.id);
  const customerIds = Array.from(new Set(orders.map((order) => order.customer_id)));

  if (orderIds.length === 0) {
    return { customers: [], items: [], payments: [] };
  }

  const [customersResult, itemsResult, paymentsResult] = await Promise.all([
    customerIds.length > 0
      ? supabase.from('customers').select(CUSTOMER_SELECT).eq('shop_id', shopId).in('id', customerIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('order_items').select(ORDER_ITEM_SELECT).eq('shop_id', shopId).in('order_id', orderIds),
    supabase.from('payments').select(PAYMENT_SELECT).eq('shop_id', shopId).in('order_id', orderIds),
  ]);

  if (customersResult.error) {
    throw new Error(customersResult.error.message);
  }

  if (itemsResult.error) {
    throw new Error(itemsResult.error.message);
  }

  if (paymentsResult.error) {
    throw new Error(paymentsResult.error.message);
  }

  return {
    customers: (customersResult.data ?? []) as CustomerRow[],
    items: (itemsResult.data ?? []) as OrderItemRow[],
    payments: (paymentsResult.data ?? []) as PaymentRow[],
  };
}

async function hydrateProductionItems(shopId: string, items: OrderItemRow[]): Promise<ProductionItem[]> {
  const orderIds = Array.from(new Set(items.map((item) => item.order_id)));

  if (orderIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseClient();
  const [ordersResult, paymentsResult] = await Promise.all([
    supabase.from('orders').select(ORDER_SELECT).eq('shop_id', shopId).in('id', orderIds).is('deleted_at', null),
    supabase.from('payments').select(PAYMENT_SELECT).eq('shop_id', shopId).in('order_id', orderIds),
  ]);

  if (ordersResult.error) throw new Error(ordersResult.error.message);
  if (paymentsResult.error) throw new Error(paymentsResult.error.message);

  const orders = (ordersResult.data ?? []) as OrderRow[];
  const customerIds = Array.from(new Set(orders.map((order) => order.customer_id)));
  const customersResult =
    customerIds.length > 0
      ? await supabase.from('customers').select(CUSTOMER_SELECT).eq('shop_id', shopId).in('id', customerIds)
      : { data: [], error: null };

  if (customersResult.error) throw new Error(customersResult.error.message);

  const ordersById = new Map(orders.map((order) => [order.id, order]));
  const customersById = new Map(((customersResult.data ?? []) as CustomerRow[]).map((customer) => [customer.id, customer]));
  const payments = (paymentsResult.data ?? []) as PaymentRow[];
  const today = format(new Date(), 'yyyy-MM-dd');

  return items.map((item) => {
    const order = ordersById.get(item.order_id) ?? null;
    const customer = order ? customersById.get(order.customer_id) ?? null : null;
    const orderPayments = payments.filter((payment) => payment.order_id === item.order_id);
    const dueDate = item.item_delivery_date ?? order?.delivery_date ?? null;

    return {
      ...item,
      order: order
        ? {
            id: order.id,
            order_number: order.order_number,
            order_date: order.order_date,
            delivery_date: order.delivery_date,
            overall_status: order.overall_status,
            total_amount: order.total_amount,
          }
        : null,
      customer: customer
        ? { id: customer.id, name: customer.name, phone: customer.phone, customer_code: customer.customer_code }
        : null,
      financial: order ? summaryFor(order, orderPayments) : { totalPaid: 0, dueAmount: 0, paymentState: 'unpaid' },
      dueDate,
      isOverdue: Boolean(dueDate && dueDate < today && item.production_status !== 'delivered' && item.production_status !== 'cancelled'),
    };
  });
}

async function matchingCustomerIds(shopId: string, search: string): Promise<string[]> {
  const filter = buildCustomerSearchOrFilter(search);

  if (!filter) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('customers')
    .select('id')
    .eq('shop_id', shopId)
    .or(filter)
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => row.id);
}

async function orderIdsForProductionStatus(shopId: string, productionStatus: ProductionStatus): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('order_items')
    .select('order_id')
    .eq('shop_id', shopId)
    .eq('production_status', productionStatus)
    .limit(1000);

  if (error) {
    throw new Error(error.message);
  }

  return Array.from(new Set((data ?? []).map((row) => row.order_id)));
}

export async function getTailorDashboardMetrics(shopId: string): Promise<DashboardMetrics> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('get_tailor_dashboard_metrics', { target_shop_id: shopId });

  if (error) {
    throw new Error(error.message);
  }

  const metrics = jsonObject(data as Json);

  return {
    newOrdersToday: toNumber(metrics.new_orders_today),
    deliveryToday: toNumber(metrics.delivery_today),
    deliveryTomorrow: toNumber(metrics.delivery_tomorrow),
    overdueOrders: toNumber(metrics.overdue_orders),
    readyForDelivery: toNumber(metrics.ready_for_delivery),
    itemsInCutting: toNumber(metrics.items_in_cutting),
    itemsInStitching: toNumber(metrics.items_in_stitching),
    itemsInFinishing: toNumber(metrics.items_in_finishing),
    totalDueAmount: toNumber(metrics.total_due_amount),
    salesThisMonth: toNumber(metrics.sales_this_month),
    ordersThisMonth: toNumber(metrics.orders_this_month),
  };
}

export async function listOrders(shopId: string, filters: OrderListFilters = {}): Promise<OrderListResult> {
  const supabase = getSupabaseClient();
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.max(filters.pageSize ?? 10, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const productionOrderIds = filters.productionStatus ? await orderIdsForProductionStatus(shopId, filters.productionStatus) : null;

  if (productionOrderIds && productionOrderIds.length === 0) {
    return { orders: [], count: 0, page, pageSize, pageCount: 1 };
  }

  let query = supabase
    .from('orders')
    .select(ORDER_SELECT, { count: 'exact' })
    .eq('shop_id', shopId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.deliveryDate) {
    query = query.eq('delivery_date', filters.deliveryDate);
  }

  if (filters.status) {
    query = query.eq('overall_status', filters.status);
  }

  if (filters.overdueOnly) {
    query = query.lt('delivery_date', format(new Date(), 'yyyy-MM-dd')).not('overall_status', 'in', '(delivered,cancelled)');
  }

  if (productionOrderIds) {
    query = query.in('id', productionOrderIds);
  }

  if (filters.search?.trim()) {
    const escaped = escapePostgrestPattern(normalizeCustomerSearch(filters.search));
    const customerIds = await matchingCustomerIds(shopId, filters.search);
    const clauses = escaped ? [`order_number.ilike.%${escaped}%`] : [];

    if (customerIds.length > 0) {
      clauses.push(`customer_id.in.(${customerIds.join(',')})`);
    }

    if (clauses.length > 0) {
      query = query.or(clauses.join(','));
    }
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const orders = (data ?? []) as OrderRow[];
  const relations = await loadOrderRelations(shopId, orders);
  let hydrated = hydrateOrders(orders, relations.customers, relations.items, relations.payments);

  if (filters.paymentState && filters.paymentState !== 'all') {
    hydrated = hydrated.filter((order) => order.paymentState === filters.paymentState);
  }

  const effectiveCount = filters.paymentState && filters.paymentState !== 'all' ? hydrated.length : (count ?? hydrated.length);

  return {
    orders: hydrated,
    count: effectiveCount,
    page,
    pageSize,
    pageCount: Math.max(Math.ceil(effectiveCount / pageSize), 1),
  };
}

export async function listDueOrders(shopId: string, search = '', limit = 50): Promise<OrderListItem[]> {
  const result = await listOrders(shopId, { search, page: 1, pageSize: limit });
  return result.orders.filter((order) => order.dueAmount > 0);
}

export async function listProductionItems(
  shopId: string,
  filters: { statuses?: ProductionStatus[]; assignedTo?: string | null; search?: string; limit?: number } = {},
): Promise<ProductionItem[]> {
  const supabase = getSupabaseClient();
  const limit = Math.min(Math.max(filters.limit ?? 120, 1), 200);
  let query = supabase
    .from('order_items')
    .select(ORDER_ITEM_SELECT)
    .eq('shop_id', shopId)
    .order('item_delivery_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters.statuses && filters.statuses.length > 0) {
    query = query.in('production_status', filters.statuses);
  }

  if (filters.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  let items = await hydrateProductionItems(shopId, (data ?? []) as OrderItemRow[]);
  const normalizedSearch = normalizeCustomerSearch(filters.search ?? '');

  if (normalizedSearch) {
    const phoneSearch = normalizeCustomerSearch(filters.search ?? '').replace(/[^0-9]+/g, '');
    items = items.filter((item) => {
      const haystack = [
        item.order?.order_number,
        item.customer?.name,
        item.customer?.phone,
        item.customer?.customer_code,
        item.garment_name_snapshot,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch) || (phoneSearch ? haystack.includes(phoneSearch) : false);
    });
  }

  return items.sort((left, right) => {
    const leftDate = left.dueDate ?? '9999-12-31';
    const rightDate = right.dueDate ?? '9999-12-31';
    return leftDate.localeCompare(rightDate);
  });
}

export async function listDeliverySections(shopId: string): Promise<DeliverySections> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const items = await listProductionItems(shopId, {
    statuses: [
      'order_received',
      'measurement_confirmed',
      'cutting',
      'stitching',
      'finishing',
      'ironing',
      'quality_check',
      'ready',
      'delivered',
    ],
    limit: 200,
  });

  return {
    ready: items.filter((item) => item.production_status === 'ready'),
    today: items.filter((item) => item.production_status !== 'delivered' && item.production_status !== 'cancelled' && item.dueDate === today),
    tomorrow: items.filter((item) => item.production_status !== 'delivered' && item.production_status !== 'cancelled' && item.dueDate === tomorrow),
    overdue: items.filter((item) => item.isOverdue),
    delivered: items.filter((item) => item.production_status === 'delivered').slice(0, 30),
  };
}

export async function listDashboardWorklists(shopId: string): Promise<DashboardWorklists> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [nextDeliveries, readyItems, overdueOrders, recentOrders, dueOrders] = await Promise.all([
    listOrders(shopId, { page: 1, pageSize: 5 }),
    listProductionItems(shopId, { statuses: ['ready'], limit: 5 }),
    listOrders(shopId, { overdueOnly: true, page: 1, pageSize: 5 }),
    listOrders(shopId, { page: 1, pageSize: 5 }),
    listDueOrders(shopId, '', 20),
  ]);

  return {
    nextDeliveries: nextDeliveries.orders
      .filter((order) => !order.delivery_date || order.delivery_date >= today)
      .slice(0, 5),
    readyItems,
    overdueOrders: overdueOrders.orders,
    recentOrders: recentOrders.orders,
    dueOrders: dueOrders.slice(0, 5),
  };
}

export async function getOrderDetail(shopId: string, orderId: string): Promise<OrderDetail> {
  const supabase = getSupabaseClient();
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('shop_id', shopId)
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (!orderData) {
    throw new Error('Order not found.');
  }

  const order = orderData as OrderRow;
  const [customerResult, itemsResult, paymentsResult, historyResult] = await Promise.all([
    supabase.from('customers').select(CUSTOMER_SELECT).eq('shop_id', shopId).eq('id', order.customer_id).maybeSingle(),
    supabase.from('order_items').select(ORDER_ITEM_SELECT).eq('shop_id', shopId).eq('order_id', orderId).order('created_at', { ascending: true }),
    supabase.from('payments').select(PAYMENT_SELECT).eq('shop_id', shopId).eq('order_id', orderId).order('paid_at', { ascending: false }),
    supabase.from('order_status_history').select(HISTORY_SELECT).eq('shop_id', shopId).eq('order_id', orderId).order('changed_at', { ascending: false }),
  ]);

  if (customerResult.error) throw new Error(customerResult.error.message);
  if (itemsResult.error) throw new Error(itemsResult.error.message);
  if (paymentsResult.error) throw new Error(paymentsResult.error.message);
  if (historyResult.error) throw new Error(historyResult.error.message);

  const payments = (paymentsResult.data ?? []) as PaymentRow[];

  return {
    order,
    customer: (customerResult.data as CustomerRow | null) ?? null,
    items: (itemsResult.data ?? []) as OrderItemRow[],
    payments,
    statusHistory: (historyResult.data ?? []) as OrderStatusHistoryRow[],
    financial: summaryFor(order, payments),
  };
}

export async function listOrderWizardContext(shopId: string): Promise<OrderWizardContext> {
  const supabase = getSupabaseClient();
  const [garmentsResult, membersResult] = await Promise.all([
    supabase
      .from('garment_types')
      .select(GARMENT_SELECT)
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true }),
    supabase.from('shop_members').select('user_id, role').eq('shop_id', shopId).eq('is_active', true),
  ]);

  if (garmentsResult.error) throw new Error(garmentsResult.error.message);
  if (membersResult.error) throw new Error(membersResult.error.message);

  return {
    garments: (garmentsResult.data ?? []) as GarmentTypeRow[],
    members: (membersResult.data ?? []) as Array<{ user_id: string; role: ShopRole }>,
  };
}

export async function listCustomerMeasurementsForOrder(shopId: string, customerId: string): Promise<MeasurementSetRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('measurement_sets')
    .select(MEASUREMENT_SELECT)
    .eq('shop_id', shopId)
    .eq('customer_id', customerId)
    .order('garment_type_id', { ascending: true })
    .order('version_number', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []) as MeasurementSetRow[];
}

export async function createOrderWithItems(shopId: string, customerId: string, payload: CreateOrderPayload): Promise<CreateOrderResult> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('create_order_with_items', {
    target_shop_id: shopId,
    target_customer_id: customerId,
    order_payload: asJsonPayload(payload),
  });

  if (error) {
    throw new Error(error.message);
  }

  const result = data as unknown as CreateOrderResult;
  return {
    order: result.order,
    items: result.items ?? [],
    payments: result.payments ?? [],
  };
}

export async function recordOrderPayment(shopId: string, orderId: string, values: PaymentFormValues): Promise<RecordPaymentResult> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('record_order_payment', {
    target_shop_id: shopId,
    target_order_id: orderId,
    payment_amount: values.amount,
    target_payment_method: values.paymentMethod as PaymentMethod,
    payment_reference: values.reference || null,
    payment_notes: values.notes || null,
    allow_overpayment: values.allowOverpayment,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as RecordPaymentResult;
}

export async function changeOrderItemStatus(
  shopId: string,
  orderItemId: string,
  status: ProductionStatus,
  note?: string | null,
): Promise<OrderItemRow> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('change_order_item_status', {
    target_shop_id: shopId,
    target_order_item_id: orderItemId,
    target_status: status,
    status_note: note ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as OrderItemRow;
}

export async function confirmOrderDelivery(shopId: string, orderItemId: string, note?: string | null): Promise<OrderItemRow> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('confirm_order_delivery', {
    target_shop_id: shopId,
    target_order_item_id: orderItemId,
    delivery_note: note ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as OrderItemRow;
}

export async function voidOrderPayment(shopId: string, paymentId: string, reason: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('void_order_payment', {
    target_shop_id: shopId,
    target_payment_id: paymentId,
    void_reason: reason,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateOrderDetails(shopId: string, orderId: string, values: OrderEditValues): Promise<OrderRow> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('orders')
    .update({
      order_date: values.orderDate,
      trial_date: values.trialDate || null,
      delivery_date: values.deliveryDate || null,
      priority: values.priority,
      notes: values.notes || null,
    })
    .eq('shop_id', shopId)
    .eq('id', orderId)
    .select(ORDER_SELECT)
    .single();

  if (error) throw new Error(error.message);

  return data as OrderRow;
}

export async function archiveOrder(shopId: string, orderId: string): Promise<OrderRow> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('orders')
    .update({ deleted_at: new Date().toISOString() })
    .eq('shop_id', shopId)
    .eq('id', orderId)
    .select(ORDER_SELECT)
    .single();

  if (error) throw new Error(error.message);

  return data as OrderRow;
}

export function jsonObject(value: Json): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}
