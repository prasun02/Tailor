import { Ruler, Settings, Shirt, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageScaffold } from '../components/PageScaffold';

const settingsLinks = [
  { to: '/settings/garments', label: 'Garment types', description: 'Create, sort, archive, and restore configurable garments.', icon: Shirt },
  { to: '/settings/measurement-fields', label: 'Measurement fields', description: 'Configure body measurement fields, ranges, units, and requirements.', icon: Ruler },
  { to: '/settings/style-fields', label: 'Style fields', description: 'Configure style preference fields and option ordering for order creation.', icon: SlidersHorizontal },
];

export function SettingsPage() {
  return (
    <PageScaffold icon={Settings} title="Settings" description="Configure garments, measurement fields, and style preferences for this shop.">
      <div className="grid gap-4 md:grid-cols-3">
        {settingsLinks.map((item) => {
          const Icon = item.icon;

          return (
            <Link key={item.to} to={item.to} className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel transition hover:border-brand-200 hover:bg-brand-50/40">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-slate-950">{item.label}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </Link>
          );
        })}
      </div>
    </PageScaffold>
  );
}
