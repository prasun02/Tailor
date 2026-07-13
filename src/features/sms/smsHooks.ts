import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SmsTemplateKey } from '../../types/database';
import { listOrderSmsLogs, listSmsTemplates, sendOrderSms, updateSmsTemplate, type SmsTemplate } from './smsService';

export const smsKeys = {
  all: ['sms'] as const,
  templates: (shopId: string) => [...smsKeys.all, shopId, 'templates'] as const,
  orderLogs: (shopId: string, orderId: string) => [...smsKeys.all, shopId, 'orders', orderId, 'logs'] as const,
};

export function useSmsTemplates(shopId: string | null) {
  return useQuery({
    queryKey: smsKeys.templates(shopId ?? ''),
    queryFn: () => listSmsTemplates(shopId ?? ''),
    enabled: Boolean(shopId),
  });
}

export function useUpdateSmsTemplate(shopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, values }: { templateId: string; values: Pick<SmsTemplate, 'body' | 'is_active'> }) =>
      updateSmsTemplate(shopId, templateId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: smsKeys.templates(shopId) });
    },
  });
}

export function useOrderSmsLogs(shopId: string | null, orderId: string | undefined) {
  return useQuery({
    queryKey: smsKeys.orderLogs(shopId ?? '', orderId ?? ''),
    queryFn: () => listOrderSmsLogs(shopId ?? '', orderId ?? ''),
    enabled: Boolean(shopId && orderId),
  });
}

export function useSendOrderSms(shopId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, templateKey }: { orderId: string; templateKey: SmsTemplateKey }) =>
      sendOrderSms({ shopId, orderId, templateKey }),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: smsKeys.orderLogs(shopId, variables.orderId) });
    },
  });
}