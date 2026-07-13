import { Archive, Images, Printer, Ruler, Settings, Shirt, SlidersHorizontal, Store, UsersRound, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { appBrand } from '../app/brand';
import { PageScaffold } from '../components/PageScaffold';
import { cn } from '../utils/cn';

type SettingsLink = {
  to?: string;
  label: string;
  description: string;
  icon: LucideIcon;
  status?: 'ready' | 'planned';
};

const settingsLinks: SettingsLink[] = [
  { to: '/settings/designs', label: 'Design Library', description: 'Manage Faabrico design samples, media URLs, cloth references, and preview metadata.', icon: Images, status: 'ready' },
  { to: '/settings/measurement-fields', label: 'Measurement Setup', description: 'Configure measurement fields, units, ranges, and required values.', icon: Ruler, status: 'ready' },
  { to: '/settings/garments', label: 'Garment Types', description: 'Create, sort, archive, and restore configurable garments.', icon: Shirt, status: 'ready' },
  { to: '/settings/style-fields', label: 'Style Fields', description: 'Configure style options such as collar, cuff, pocket, fit, and finishing.', icon: SlidersHorizontal, status: 'ready' },
  { label: 'Staff', description: 'Invite and manage owner, manager, staff, cutter, tailor, and viewer access.', icon: UsersRound, status: 'planned' },
  { to: '/settings/shop-profile', label: 'Shop Profile', description: `${appBrand.name}, phone, address, logo URL, and receipt identity.`, icon: Store, status: 'ready' },
  { label: 'Print Settings', description: 'Customer token, production copy, and store copy preferences.', icon: Printer, status: 'planned' },
  { label: 'Backup', description: 'Export guidance and low-cost shop data backup workflow.', icon: Archive, status: 'planned' },
];

export function SettingsPage() {
  return (
    <PageScaffold icon={Settings} title="Settings" description="Configure Faabrico profile, design, measurement, garment, style, staff, print, and backup settings for this shop.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {settingsLinks.map((item) => (
          <SettingsCard key={item.label} item={item} />
        ))}
      </div>
    </PageScaffold>
  );
}

function SettingsCard({ item }: { item: SettingsLink }) {
  const Icon = item.icon;
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-200">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', item.status === 'planned' ? 'bg-slate-100 text-slate-600' : 'bg-accent-50 text-accent-700')}>
          {item.status === 'planned' ? 'Planned' : 'Ready'}
        </span>
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-950">{item.label}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
    </>
  );

  if (!item.to) {
    return <div className="rounded-lg border border-brand-200 bg-white p-5 opacity-90 shadow-panel">{content}</div>;
  }

  return (
    <Link to={item.to} className="rounded-lg border border-brand-200 bg-white p-5 shadow-panel transition hover:border-accent-500 hover:bg-brand-50/80">
      {content}
    </Link>
  );
}