import { BarChart3 } from 'lucide-react';
import { PageScaffold } from '../components/PageScaffold';
import { EmptyState } from '../components/ui/EmptyState';

export function ReportsPage() {
  return (
    <PageScaffold icon={BarChart3} title="Reports" description="Sales, delivery, outstanding balance, and production reports will be added after the data model is in place.">
      <EmptyState icon={BarChart3} title="Reports pending" message="Reports require shop-scoped database views and functions, which are outside this foundation phase." />
    </PageScaffold>
  );
}