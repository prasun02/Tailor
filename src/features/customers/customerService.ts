import { format } from 'date-fns';
import type { Database } from '../../types/database';
import { getSupabaseClient } from '../../services/supabaseClient';
import type { CustomerFormValues } from './customerSchema';
import type { CustomerListParams } from './customerQueryKeys';
import { escapePostgrestPattern, normalizeCustomerSearch } from './search';
import { normalizeName, normalizePhone, normalizePhoneInput, optionalTrimmed } from './phone';

type CustomerRow = Database['public']['Tables']['customers']['Row'];
type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type CustomerUpdate = Database['public']['Tables']['customers']['Update'];
type OrderRow = Database['public']['Tables']['orders']['Row'];
type PaymentRow = Database['public']['Tables']['payments']['Row'];
type MeasurementSetRow = Database['public']['Tables']['measurement_sets']['Row'];

type SupabaseErrorLike = {
  code?: string;
  message: string;
};

const PAGE_SIZE = 10;
const CUSTOMER_SELECT =
  'id, shop_id, customer_code, name, normalized_name, phone, normalized_phone, alternative_phone, address, notes, is_active, created_by, created_at, updated_at, deleted_at';
const ORDER_SELECT =
  'id, shop_id, order_number, customer_id, order_date, trial_date, delivery_date, priority, overall_status, subtotal, discount_amount, total_amount, notes, created_by, delivered_at, created_at, updated_at, deleted_at';
const PAYMENT_SELECT =
  'id, shop_id, order_id, amount, payment_method, payment_status, reference, notes, paid_at, received_by, voided_at, voided_by, void_reason, created_at';
const MEASUREMENT_SELECT =
  'id, shop_id, customer_id, garment_type_id, version_number, unit, values, notes, measured_at, measured_by, is_current, created_at';

export type Customer = CustomerRow;

export type CustomerOrderSummary = Pick<
  OrderRow,
  'id' | 'customer_id' | 'order_number' | 'order_date' | 'delivery_date' | 'overall_status' | 'total_amount'
>;

export type CustomerPaymentSummary = Pick<PaymentRow, 'id' | 'order_id' | 'amount' | 'payment_method' | 'payment_status' | 'paid_at'> & {
  order_number: string | null;
};

export type CustomerMeasurementSummary = Pick<
  MeasurementSetRow,
  'id' | 'garment_type_id' | 'version_number' | 'unit' | 'notes' | 'measured_at' | 'is_current' | 'created_at'
>;

export type CustomerSummary = {
  latestOrder: CustomerOrderSummary | null;
  upcomingDelivery: CustomerOrderSummary | null;
  outstandingAmount: number;
  totalPaid: number;
};

export type CustomerListItem = Customer & CustomerSummary;

export type CustomerListResult = {
  customers: CustomerListItem[];
  count: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type CustomerProfile = {
  customer: Customer;
  summary: CustomerSummary;
  orders: CustomerOrderSummary[];
  payments: CustomerPaymentSummary[];
  measurements: CustomerMeasurementSummary[];
};

export function buildCustomerSearchOrFilter(search: string): string | null {
  const textSearch = normalizeCustomerSearch(search);
  const normalizedPhone = normalizePhone(search);
  const filters: string[] = [];

  if (textSearch) {
    const escapedText = escapePostgrestPattern(textSearch);

    if (escapedText) {
      filters.push(`normalized_name.ilike.%${escapedText}%`);
      filters.push(`customer_code.ilike.%${escapedText}%`);
    }
  }

  if (normalizedPhone) {
    const escapedPhone = escapePostgrestPattern(normalizedPhone);
    filters.push(`normalized_phone.ilike.%${escapedPhone}%`);
  }

  return filters.length > 0 ? filters.join(',') : null;
}

export function getCustomerMutationErrorMessage(error: SupabaseErrorLike): string {
  if (error.code === '23505') {
    return 'A customer with this active phone number already exists in this shop.';
  }

  return error.message;
}

function throwCustomerError(error: SupabaseErrorLike): never {
  throw new Error(getCustomerMutationErrorMessage(error));
}

function generateCustomerCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CUS-${timestamp}-${random}`;
}

function toCustomerInsert(shopId: string, values: CustomerFormValues, userId?: string | null): CustomerInsert {
  const phone = normalizePhoneInput(values.phone);
  const alternativePhone = normalizePhoneInput(values.alternativePhone);
  const name = values.name.trim().replace(/\s+/g, ' ');

  return {
    shop_id: shopId,
    customer_code: generateCustomerCode(),
    name,
    normalized_name: normalizeName(name),
    phone,
    normalized_phone: normalizePhone(phone),
    alternative_phone: alternativePhone,
    address: optionalTrimmed(values.address),
    notes: optionalTrimmed(values.notes),
    is_active: true,
    created_by: userId ?? null,
  };
}

function toCustomerUpdate(values: CustomerFormValues): CustomerUpdate {
  const phone = normalizePhoneInput(values.phone);
  const alternativePhone = normalizePhoneInput(values.alternativePhone);
  const name = values.name.trim().replace(/\s+/g, ' ');

  return {
    name,
    normalized_name: normalizeName(name),
    phone,
    normalized_phone: normalizePhone(phone),
    alternative_phone: alternativePhone,
    address: optionalTrimmed(values.address),
    notes: optionalTrimmed(values.notes),
  };
}

function emptySummary(): CustomerSummary {
  return {
    latestOrder: null,
    upcomingDelivery: null,
    outstandingAmount: 0,
    totalPaid: 0,
  };
}

function summarizeCustomers(orders: CustomerOrderSummary[], payments: Pick<PaymentRow, 'order_id' | 'amount' | 'payment_status'>[]): Map<string, CustomerSummary> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const summaries = new Map<string, CustomerSummary>();
  const paidByOrderId = new Map<string, number>();

  for (const payment of payments) {
    if (payment.payment_status !== 'completed') {
      continue;
    }

    paidByOrderId.set(payment.order_id, (paidByOrderId.get(payment.order_id) ?? 0) + Number(payment.amount));
  }

  for (const order of orders) {
    const summary = summaries.get(order.customer_id) ?? emptySummary();
    const totalAmount = Number(order.total_amount);
    const paidAmount = paidByOrderId.get(order.id) ?? 0;

    summary.outstandingAmount += Math.max(totalAmount - paidAmount, 0);
    summary.totalPaid += paidAmount;

    if (!summary.latestOrder || order.order_date > summary.latestOrder.order_date) {
      summary.latestOrder = order;
    }

    if (
      order.delivery_date &&
      order.delivery_date >= today &&
      order.overall_status !== 'delivered' &&
      order.overall_status !== 'cancelled' &&
      (!summary.upcomingDelivery || order.delivery_date < summary.upcomingDelivery.delivery_date!)
    ) {
      summary.upcomingDelivery = order;
    }

    summaries.set(order.customer_id, summary);
  }

  return summaries;
}

async function loadSummaries(shopId: string, customerIds: string[]): Promise<Map<string, CustomerSummary>> {
  if (customerIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseClient();
  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('shop_id', shopId)
    .in('customer_id', customerIds)
    .is('deleted_at', null);

  if (ordersError) {
    throw new Error(ordersError.message);
  }

  const orders = (ordersData ?? []) as CustomerOrderSummary[];
  const orderIds = orders.map((order) => order.id);

  if (orderIds.length === 0) {
    return new Map();
  }

  const { data: paymentsData, error: paymentsError } = await supabase
    .from('payments')
    .select('order_id, amount, payment_status')
    .eq('shop_id', shopId)
    .in('order_id', orderIds);

  if (paymentsError) {
    throw new Error(paymentsError.message);
  }

  return summarizeCustomers(orders, (paymentsData ?? []) as Pick<PaymentRow, 'order_id' | 'amount' | 'payment_status'>[]);
}

export async function listCustomers(params: CustomerListParams): Promise<CustomerListResult> {
  const supabase = getSupabaseClient();
  const page = Math.max(params.page ?? 1, 1);
  const pageSize = Math.max(params.pageSize ?? PAGE_SIZE, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('customers')
    .select(CUSTOMER_SELECT, { count: 'exact' })
    .eq('shop_id', params.shopId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (!params.includeArchived) {
    query = query.eq('is_active', true).is('deleted_at', null);
  }

  const searchFilter = params.search ? buildCustomerSearchOrFilter(params.search) : null;

  if (searchFilter) {
    query = query.or(searchFilter);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const customers = (data ?? []) as Customer[];
  const summaries = await loadSummaries(
    params.shopId,
    customers.map((customer) => customer.id),
  );

  return {
    customers: customers.map((customer) => ({ ...customer, ...(summaries.get(customer.id) ?? emptySummary()) })),
    count: count ?? 0,
    page,
    pageSize,
    pageCount: Math.max(Math.ceil((count ?? 0) / pageSize), 1),
  };
}

export async function getCustomer(shopId: string, customerId: string): Promise<CustomerProfile> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('customers')
    .select(CUSTOMER_SELECT)
    .eq('shop_id', shopId)
    .eq('id', customerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Customer not found.');
  }

  const customer = data as Customer;
  const summaries = await loadSummaries(shopId, [customerId]);
  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('shop_id', shopId)
    .eq('customer_id', customerId)
    .is('deleted_at', null)
    .order('order_date', { ascending: false })
    .limit(10);

  if (ordersError) {
    throw new Error(ordersError.message);
  }

  const orders = (ordersData ?? []) as CustomerOrderSummary[];
  const orderIds = orders.map((order) => order.id);
  let payments: CustomerPaymentSummary[] = [];

  if (orderIds.length > 0) {
    const orderNumberById = new Map(orders.map((order) => [order.id, order.order_number]));
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select(PAYMENT_SELECT)
      .eq('shop_id', shopId)
      .in('order_id', orderIds)
      .order('paid_at', { ascending: false })
      .limit(10);

    if (paymentsError) {
      throw new Error(paymentsError.message);
    }

    payments = ((paymentsData ?? []) as PaymentRow[]).map((payment) => ({
      id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      payment_method: payment.payment_method,
      payment_status: payment.payment_status,
      paid_at: payment.paid_at,
      order_number: orderNumberById.get(payment.order_id) ?? null,
    }));
  }

  const { data: measurementsData, error: measurementsError } = await supabase
    .from('measurement_sets')
    .select(MEASUREMENT_SELECT)
    .eq('shop_id', shopId)
    .eq('customer_id', customerId)
    .order('measured_at', { ascending: false })
    .limit(10);

  if (measurementsError) {
    throw new Error(measurementsError.message);
  }

  return {
    customer,
    summary: summaries.get(customer.id) ?? emptySummary(),
    orders,
    payments,
    measurements: (measurementsData ?? []) as CustomerMeasurementSummary[],
  };
}

export async function findDuplicateCustomerByPhone(
  shopId: string,
  normalizedPhone: string,
  excludeCustomerId?: string,
): Promise<Customer | null> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('customers')
    .select(CUSTOMER_SELECT)
    .eq('shop_id', shopId)
    .eq('normalized_phone', normalizedPhone)
    .eq('is_active', true)
    .is('deleted_at', null)
    .limit(1);

  if (excludeCustomerId) {
    query = query.neq('id', excludeCustomerId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Customer | null) ?? null;
}

export async function createCustomer(shopId: string, values: CustomerFormValues, userId?: string | null): Promise<Customer> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('customers')
    .insert(toCustomerInsert(shopId, values, userId))
    .select(CUSTOMER_SELECT)
    .single();

  if (error) {
    throwCustomerError(error);
  }

  return data as Customer;
}

export async function updateCustomer(shopId: string, customerId: string, values: CustomerFormValues): Promise<Customer> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('customers')
    .update(toCustomerUpdate(values))
    .eq('shop_id', shopId)
    .eq('id', customerId)
    .select(CUSTOMER_SELECT)
    .single();

  if (error) {
    throwCustomerError(error);
  }

  return data as Customer;
}

export async function archiveCustomer(shopId: string, customerId: string): Promise<Customer> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('customers')
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq('shop_id', shopId)
    .eq('id', customerId)
    .select(CUSTOMER_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Customer;
}

export async function restoreCustomer(shopId: string, customerId: string): Promise<Customer> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('customers')
    .update({ is_active: true, deleted_at: null })
    .eq('shop_id', shopId)
    .eq('id', customerId)
    .select(CUSTOMER_SELECT)
    .single();

  if (error) {
    throwCustomerError(error);
  }

  return data as Customer;
}


