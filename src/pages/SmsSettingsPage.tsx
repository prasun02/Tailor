import { MessageSquare, Save, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageScaffold } from '../components/PageScaffold';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { useShop } from '../features/shop/shopContext';
import { smsTemplateLabels, smsTemplateVariableHelp, type SmsTemplate } from '../features/sms/smsService';
import { useSmsTemplates, useUpdateSmsTemplate } from '../features/sms/smsHooks';
import { canManageConfiguration } from '../utils/authorization';

export function SmsSettingsPage() {
  const { currentRole, currentShopId } = useShop();
  const canEdit = canManageConfiguration(currentRole);
  const templatesQuery = useSmsTemplates(currentShopId);
  const updateTemplate = useUpdateSmsTemplate(currentShopId ?? '');

  if (!canEdit) {
    return (
      <PageScaffold icon={MessageSquare} title="SMS Settings" description="Configure server-side SMS templates for Faabrico order updates.">
        <EmptyState icon={ShieldAlert} title="SMS settings are restricted" message="Only owners and managers can update SMS templates and gateway settings." />
      </PageScaffold>
    );
  }

  if (templatesQuery.isLoading) {
    return <Loading label="Loading SMS templates" />;
  }

  return (
    <PageScaffold icon={MessageSquare} title="SMS Settings" description="Templates are edited in the app; gateway credentials stay in Supabase Edge Function secrets.">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="space-y-4">
          {templatesQuery.isError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{templatesQuery.error.message}</p>
          ) : null}
          {templatesQuery.data?.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No SMS templates found" message="Run the Phase 1 SMS migration in Supabase to seed default templates." />
          ) : null}
          {templatesQuery.data?.map((template) => (
            <SmsTemplateCard
              key={template.id}
              template={template}
              isSaving={updateTemplate.isPending}
              onSave={(values) => updateTemplate.mutate({ templateId: template.id, values })}
            />
          ))}
          {updateTemplate.isError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{updateTemplate.error.message}</p>
          ) : null}
          {updateTemplate.isSuccess ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">SMS template saved.</p>
          ) : null}
        </section>

        <aside className="space-y-4 rounded-lg border border-brand-200 bg-white p-4 shadow-panel">
          <div>
            <h2 className="font-semibold text-slate-950">Edge Function secrets</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Set these in Supabase, never in frontend environment files.</p>
          </div>
          <ul className="grid gap-2 text-sm font-semibold text-brand-900">
            <li>SMS_API_URL</li>
            <li>SMS_API_KEY</li>
            <li>SMS_SENDER_ID</li>
            <li>SMS_PROVIDER_NAME</li>
          </ul>
          <div className="rounded-lg border border-accent-100 bg-accent-50 p-3 text-sm leading-6 text-slate-700">
            Frontend calls only the `send_order_sms` Edge Function. Provider keys are read by the function at runtime.
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-950">Available variables</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {smsTemplateVariableHelp.map((variable) => (
                <code key={variable} className="rounded bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-900">{`{{${variable}}}`}</code>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </PageScaffold>
  );
}

function SmsTemplateCard({
  template,
  isSaving,
  onSave,
}: {
  template: SmsTemplate;
  isSaving: boolean;
  onSave: (values: Pick<SmsTemplate, 'body' | 'is_active'>) => void;
}) {
  const [body, setBody] = useState(template.body);
  const [isActive, setIsActive] = useState(template.is_active);

  useEffect(() => {
    setBody(template.body);
    setIsActive(template.is_active);
  }, [template.body, template.is_active]);

  return (
    <article className="rounded-lg border border-brand-200 bg-white p-4 shadow-panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-accent-700">{template.template_key}</p>
          <h2 className="text-lg font-semibold text-slate-950">{smsTemplateLabels[template.template_key]}</h2>
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-4 w-4 accent-brand-700" />
          Active
        </label>
      </div>
      <label className="mt-4 block space-y-2">
        <span className="text-sm font-medium text-slate-700">Message body</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={5}
          maxLength={500}
          className="min-h-32 w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        />
      </label>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">{body.length}/500 characters</p>
        <button
          type="button"
          disabled={isSaving || body.trim().length < 10}
          onClick={() => onSave({ body: body.trim(), is_active: isActive })}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          Save template
        </button>
      </div>
    </article>
  );
}