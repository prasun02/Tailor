import { Ruler } from 'lucide-react';
import { PageScaffold } from '../components/PageScaffold';
import { EmptyState } from '../components/ui/EmptyState';

export function MeasurementsPage() {
  return (
    <PageScaffold icon={Ruler} title="Measurements" description="Configurable measurement fields and version history will be connected after schema creation.">
      <EmptyState icon={Ruler} title="Measurement setup pending" message="This placeholder keeps the navigation ready without creating measurement tables during the foundation phase." />
    </PageScaffold>
  );
}