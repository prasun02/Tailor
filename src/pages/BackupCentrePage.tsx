import { Archive, Database, ShieldAlert } from 'lucide-react';
import { PageScaffold } from '../components/PageScaffold';
import { EmptyState } from '../components/ui/EmptyState';
import { Card, SectionHeader } from '../components/ui/designSystem';
import { useShop } from '../features/shop/shopContext';

const backupItems = [
  'Use Supabase dashboard exports for full PostgreSQL backups on the Free plan.',
  'Keep exported files outside the public app repository.',
  'Run exports from an owner account so RLS limits data to active shop membership.',
  'Use date-filtered reports for routine operational snapshots.',
];

export function BackupCentrePage() {
  const { currentRole } = useShop();

  if (currentRole !== 'owner') {
    return (
      <PageScaffold icon={Archive} title="Backup Centre" description="Owner-only backup guidance for Faabrico shop data.">
        <EmptyState icon={ShieldAlert} title="Backup centre is restricted" message="Only shop owners can prepare complete shop backup exports." />
      </PageScaffold>
    );
  }

  return (
    <PageScaffold icon={Archive} title="Backup Centre" description="Owner-only backup guidance for Faabrico shop data.">
      <Card>
        <SectionHeader icon={Database} title="Supabase backup checklist" description="Use the hosted database tools and keep every export protected as financial customer data." />
        <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
          {backupItems.map((item) => (
            <li key={item} className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      </Card>
    </PageScaffold>
  );
}