import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CustomerFormValues } from './customerSchema';
import { customerKeys, type CustomerListParams } from './customerQueryKeys';
import {
  archiveCustomer,
  createCustomer,
  findDuplicateCustomerByPhone,
  getCustomer,
  listCustomers,
  restoreCustomer,
  updateCustomer,
} from './customerService';
import { isValidPhone, normalizePhone } from './phone';

export function useCustomerList(params: Omit<CustomerListParams, 'shopId'> & { shopId: string | null }) {
  const shopId = params.shopId ?? '';

  return useQuery({
    queryKey: customerKeys.list({ ...params, shopId }),
    queryFn: () => listCustomers({ ...params, shopId }),
    enabled: Boolean(params.shopId),
  });
}

export function useCustomer(shopId: string | null, customerId: string | undefined) {
  return useQuery({
    queryKey: customerKeys.detail(shopId ?? '', customerId ?? ''),
    queryFn: () => getCustomer(shopId ?? '', customerId ?? ''),
    enabled: Boolean(shopId && customerId),
  });
}

export function useDuplicateCustomerPhone(shopId: string | null, phone: string | undefined, customerId?: string) {
  const normalizedPhone = normalizePhone(phone);

  return useQuery({
    queryKey: customerKeys.duplicatePhone(shopId ?? '', normalizedPhone, customerId),
    queryFn: () => findDuplicateCustomerByPhone(shopId ?? '', normalizedPhone ?? '', customerId),
    enabled: Boolean(shopId && normalizedPhone && isValidPhone(phone)),
    staleTime: 5_000,
  });
}

export function useCreateCustomer(shopId: string, userId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CustomerFormValues) => createCustomer(shopId, values, userId),
    onSuccess: (customer) => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists(shopId) });
      void queryClient.invalidateQueries({ queryKey: customerKeys.duplicatePhone(shopId, customer.normalized_phone) });
    },
  });
}

export function useUpdateCustomer(shopId: string, customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CustomerFormValues) => updateCustomer(shopId, customerId, values),
    onSuccess: (customer) => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists(shopId) });
      void queryClient.invalidateQueries({ queryKey: customerKeys.detail(shopId, customer.id) });
      void queryClient.invalidateQueries({ queryKey: customerKeys.duplicatePhone(shopId, customer.normalized_phone, customer.id) });
    },
  });
}

export function useArchiveCustomer(shopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerId: string) => archiveCustomer(shopId, customerId),
    onSuccess: (customer) => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists(shopId) });
      void queryClient.invalidateQueries({ queryKey: customerKeys.detail(shopId, customer.id) });
    },
  });
}

export function useRestoreCustomer(shopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerId: string) => restoreCustomer(shopId, customerId),
    onSuccess: (customer) => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists(shopId) });
      void queryClient.invalidateQueries({ queryKey: customerKeys.detail(shopId, customer.id) });
    },
  });
}
