import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';

type SmsTemplateKey = 'order_confirmed' | 'order_ready' | 'delivered';

type SendOrderSmsPayload = {
  shopId?: string;
  orderId?: string;
  templateKey?: SmsTemplateKey;
};

type SmsRequestRow = {
  log_id: string;
  recipient_phone: string | null;
  message_body: string;
  provider_name: string | null;
  should_send: boolean;
};

type SmsDeliveryStatus = 'sent' | 'failed' | 'skipped';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function isSmsTemplateKey(value: unknown): value is SmsTemplateKey {
  return value === 'order_confirmed' || value === 'order_ready' || value === 'delivered';
}

function firstSmsRequestRow(value: unknown): SmsRequestRow | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const row = value[0];

  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return null;
  }

  const record = row as Record<string, unknown>;

  if (typeof record.log_id !== 'string' || typeof record.message_body !== 'string') {
    return null;
  }

  return {
    log_id: record.log_id,
    recipient_phone: typeof record.recipient_phone === 'string' ? record.recipient_phone : null,
    message_body: record.message_body,
    provider_name: typeof record.provider_name === 'string' ? record.provider_name : null,
    should_send: record.should_send === true,
  };
}

function providerMessageId(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = record.message_id ?? record.messageId ?? record.id ?? record.sid;

  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const supabaseUrl = requireEnv('SUPABASE_URL');
    const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');
    const smsApiUrl = requireEnv('SMS_API_URL');
    const smsApiKey = requireEnv('SMS_API_KEY');
    const smsSenderId = requireEnv('SMS_SENDER_ID');
    const smsProviderName = requireEnv('SMS_PROVIDER_NAME');
    const authorization = request.headers.get('Authorization')?.trim();

    if (!authorization?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Authentication required.' }, 401);
    }

    const payload = (await request.json()) as SendOrderSmsPayload;

    if (!payload.shopId || !payload.orderId || !isSmsTemplateKey(payload.templateKey)) {
      return jsonResponse({ error: 'shopId, orderId, and a supported templateKey are required.' }, 400);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: userResult, error: userError } = await supabase.auth.getUser();

    if (userError || !userResult.user) {
      return jsonResponse({ error: 'Invalid user session.' }, 401);
    }

    const { data: requestData, error: requestError } = await supabase.rpc('request_order_sms', {
      target_shop_id: payload.shopId,
      target_order_id: payload.orderId,
      target_template_key: payload.templateKey,
    });

    if (requestError) {
      return jsonResponse({ error: requestError.message }, 400);
    }

    const smsRequest = firstSmsRequestRow(requestData);

    if (!smsRequest) {
      return jsonResponse({ error: 'SMS request could not be created.' }, 500);
    }

    if (!smsRequest.should_send || !smsRequest.recipient_phone) {
      return jsonResponse({ status: 'skipped', logId: smsRequest.log_id });
    }

    let deliveryStatus: SmsDeliveryStatus = 'failed';
    let providerId: string | null = null;
    let providerError: string | null = null;

    try {
      const providerResponse = await fetch(smsApiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${smsApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_id: smsSenderId,
          to: smsRequest.recipient_phone,
          message: smsRequest.message_body,
          provider: smsProviderName,
        }),
      });
      const responseText = await providerResponse.text();
      let parsedResponse: unknown = null;

      if (responseText.trim()) {
        try {
          parsedResponse = JSON.parse(responseText);
        } catch {
          parsedResponse = { raw: responseText.slice(0, 300) };
        }
      }

      if (providerResponse.ok) {
        deliveryStatus = 'sent';
        providerId = providerMessageId(parsedResponse);
      } else {
        providerError = responseText.slice(0, 300) || `SMS provider returned ${providerResponse.status}.`;
      }
    } catch (error) {
      providerError = error instanceof Error ? error.message : 'SMS provider request failed.';
    }

    const { error: updateError } = await supabase.rpc('record_sms_delivery_result', {
      target_log_id: smsRequest.log_id,
      delivery_status: deliveryStatus,
      target_provider_name: smsProviderName,
      target_provider_message_id: providerId,
      target_error_message: providerError,
    });

    if (updateError) {
      return jsonResponse({ error: updateError.message, logId: smsRequest.log_id }, 500);
    }

    return jsonResponse({
      status: deliveryStatus,
      logId: smsRequest.log_id,
      providerMessageId: providerId,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'SMS send failed.' }, 500);
  }
});