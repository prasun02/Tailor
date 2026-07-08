import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listCustomers } from '../customers/customerService';
import type { OrderListFilters, PaymentFormValues, OrderEditValues } from './orderSchemas';
import type { ProductionStatus } from '../../types/database';
import type { CreateOrderPayload } from './orderPayload';
import { orderKeys } from './orderQueryKeys';
import {
  archiveOrder,
  changeOrderItemStatus,
  confirmOrderDelivery,
  createOrderWithItems,
  getTailorDashboardMetrics,
  getOrderDetail,
  listDashboardWorklists,
  listCustomerMeasurementsForOrder,
  listDeliverySections,
  listDueOrders,
  listOrders,
  listOrderWizardContext,
  listProductionItems,
  recordOrderPayment,
  updateOrderDetails,
  voidOrderPayment,
} from './orderService';

export function useOrders(shopId: string | null, filters: OrderListFilters) {
  return useQuery({
    queryKey: orderKeys.list(shopId ?? '', filters),
    queryFn: () => listOrders(shopId ?? '', filters),
    enabled: Boolean(shopId),
  });
}

export function useOrderDetail(shopId: string | null, orderId: string | undefined) {
  return useQuery({
    queryKey: orderKeys.detail(shopId ?? '', orderId ?? ''),
    queryFn: () => getOrderDetail(shopId ?? '', orderId ?? ''),
    enabled: Boolean(shopId && orderId),
  });
}

export function useOrderWizardContext(shopId: string | null) {
  return useQuery({
    queryKey: orderKeys.wizard(shopId ?? ''),
    queryFn: () => listOrderWizardContext(shopId ?? ''),
    enabled: Boolean(shopId),
  });
}

export function useTailorDashboardMetrics(shopId: string | null) {
  return useQuery({
    queryKey: orderKeys.dashboard(shopId ?? ''),
    queryFn: () => getTailorDashboardMetrics(shopId ?? ''),
    enabled: Boolean(shopId),
  });
}

export function useDashboardWorklists(shopId: string | null) {
  return useQuery({
    queryKey: orderKeys.dashboardWorklists(shopId ?? ''),
    queryFn: () => listDashboardWorklists(shopId ?? ''),
    enabled: Boolean(shopId),
  });
}

export function useProductionItems(
  shopId: string | null,
  filters: { statuses?: ProductionStatus[]; assignedTo?: string | null; search?: string; limit?: number },
) {
  return useQuery({
    queryKey: orderKeys.production(shopId ?? '', filters),
    queryFn: () => listProductionItems(shopId ?? '', filters),
    enabled: Boolean(shopId),
  });
}

export function useDeliverySections(shopId: string | null) {
  return useQuery({
    queryKey: orderKeys.deliveries(shopId ?? ''),
    queryFn: () => listDeliverySections(shopId ?? ''),
    enabled: Boolean(shopId),
  });
}

export function useDueOrders(shopId: string | null, search: string) {
  return useQuery({
    queryKey: orderKeys.due(shopId ?? '', search.trim()),
    queryFn: () => listDueOrders(shopId ?? '', search, 60),
    enabled: Boolean(shopId),
  });
}

export function useOrderCustomerSearch(shopId: string | null, search: string) {
  return useQuery({
    queryKey: [...orderKeys.wizard(shopId ?? ''), 'customers', search.trim()],
    queryFn: () => listCustomers({ shopId: shopId ?? '', search, page: 1, pageSize: 8, includeArchived: false }),
    enabled: Boolean(shopId && search.trim().length >= 2),
  });
}

export function useCustomerMeasurementsForOrder(shopId: string | null, customerId: string | undefined) {
  return useQuery({
    queryKey: [...orderKeys.wizard(shopId ?? ''), 'measurements', customerId ?? ''],
    queryFn: () => listCustomerMeasurementsForOrder(shopId ?? '', customerId ?? ''),
    enabled: Boolean(shopId && customerId),
  });
}

export function useCreateOrder(shopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, payload }: { customerId: string; payload: CreateOrderPayload }) => createOrderWithItems(shopId, customerId, payload),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists(shopId) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(shopId, result.order.id) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.dashboard(shopId) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.dashboardWorklists(shopId) });
    },
  });
}

export function useRecordOrderPayment(shopId: string, orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: PaymentFormValues) => recordOrderPayment(shopId, orderId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists(shopId) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(shopId, orderId) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.deliveries(shopId) });
      void queryClient.invalidateQueries({ queryKey: [...orderKeys.all, shopId, 'due'] });
      void queryClient.invalidateQueries({ queryKey: orderKeys.dashboard(shopId) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.dashboardWorklists(shopId) });
    },
  });
}

export function useChangeOrderItemStatus(shopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderItemId, status, note }: { orderItemId: string; status: ProductionStatus; note?: string | null }) =>
      changeOrderItemStatus(shopId, orderItemId, status, note),
    onSuccess: (item) => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists(shopId) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(shopId, item.order_id) });
      void queryClient.invalidateQueries({ queryKey: [...orderKeys.all, shopId, 'production'] });
      void queryClient.invalidateQueries({ queryKey: orderKeys.deliveries(shopId) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.dashboard(shopId) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.dashboardWorklists(shopId) });
    },
  });
}

export function useConfirmOrderDelivery(shopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderItemId, note }: { orderItemId: string; note?: string | null }) => confirmOrderDelivery(shopId, orderItemId, note),
    onSuccess: (item) => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists(shopId) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(shopId, item.order_id) });
      void queryClient.invalidateQueries({ queryKey: [...orderKeys.all, shopId, 'production'] });
      void queryClient.invalidateQueries({ queryKey: orderKeys.deliveries(shopId) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.dashboard(shopId) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.dashboardWorklists(shopId) });
    },
  });
}

export function useVoidOrderPayment(shopId: string, orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) => voidOrderPayment(shopId, paymentId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists(shopId) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(shopId, orderId) });
    },
  });
}

export function useUpdateOrderDetails(shopId: string, orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: OrderEditValues) => updateOrderDetails(shopId, orderId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists(shopId) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(shopId, orderId) });
    },
  });
}

export function useArchiveOrder(shopId: string, orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => archiveOrder(shopId, orderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists(shopId) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(shopId, orderId) });
    },
  });
}
