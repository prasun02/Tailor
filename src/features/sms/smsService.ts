import { getSupabaseClient } from '../../services/supabaseClient';
import type { Database, SmsLogStatus, SmsTemplateKey } from '../../types/database';

export type SmsTemplate = Database['public']['Tables']['sms_templates']['Row'];
export type SmsLog = Database['public']['Tables']['sms_logs']['Row'];
export type SmsSendResult = {
  status: SmsLogStatus;
  logId?: string;
  providerMessageId?: string | null;
};

export const smsTemplateLabels: Record<SmsTemplateKey, string> = {
  order_confirmed: 'Order confirmed',
  order_ready: 'Order ready',
  delivered: 'Delivered',
};

export const smsTemplateVariableHelp = [
  'customer_name',
  'order_number',
  'delivery_date',
  'advance_amount',
  'due_amount',
  'shop_phone',
] as const;

const SMS_TEMPLATE_SELECT = 'id, shop_id, template_key, body, is_active, created_at, updated_at';
const SMS_LOG_SELECT = 'id, shop_id, order_id, customer_id, template_key, recipient_phone, message_body, provider_name, provider_message_id, status, error_message, requested_by, sent_at, created_at, updated_at';

function parseSendResult(value: unknown): SmsSendResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { status: 'failed' };
  }

  const record = value as Record<string, unknown>;
  const status = record.status === 'sent' || record.status === 'failed' || record.status === 'skipped' ? record.status : 'failed';

  return {
    status,
    logId: typeof record.logId === 'string' ? record.logId : undefined,
    providerMessageId: typeof record.providerMessageId === 'string' ? record.providerMessageId : null,
  };
}

export async function listSmsTemplates(shopId: string): Promise<SmsTemplate[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('sms_templates')
    .select(SMS_TEMPLATE_SELECT)
    .eq('shop_id', shopId)
    .order('template_key', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as SmsTemplate[];
}

export async function updateSmsTemplate(
  shopId: string,
  templateId: string,
  values: Pick<SmsTemplate, 'body' | 'is_active'>,
): Promise<SmsTemplate> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('sms_templates')
    .update({ body: values.body, is_active: values.is_active })
    .eq('shop_id', shopId)
    .eq('id', templateId)
    .select(SMS_TEMPLATE_SELECT)
    .single();

  if (error) throw new Error(error.message);

  return data as SmsTemplate;
}

export async function listOrderSmsLogs(shopId: string, orderId: string): Promise<SmsLog[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('sms_logs')
    .select(SMS_LOG_SELECT)
    .eq('shop_id', shopId)
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);

  return (data ?? []) as SmsLog[];
}

export async function sendOrderSms({
  shopId,
  orderId,
  templateKey,
}: {
  shopId: string;
  orderId: string;
  templateKey: SmsTemplateKey;
}): Promise<SmsSendResult> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('send_order_sms', {
    body: { shopId, orderId, templateKey },
  });

  if (error) throw new Error(error.message);

  const result = parseSendResult(data);

  if (result.status === 'failed') {
    throw new Error('SMS send failed. Check SMS logs and Edge Function secrets.');
  }

  return result;
}