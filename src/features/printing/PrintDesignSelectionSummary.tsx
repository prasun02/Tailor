import { designSelectionEntriesFromSnapshot, designSummaryFromSnapshot } from '../design-selection/designSelectionUtils';

type PrintDesignSelectionSummaryProps = {
  snapshot: unknown;
  title?: string;
  compact?: boolean;
};

export function PrintDesignSelectionSummary({
  snapshot,
  title = 'Design Details',
  compact = false,
}: PrintDesignSelectionSummaryProps) {
  const entries = designSelectionEntriesFromSnapshot(snapshot);
  const summary = designSummaryFromSnapshot(snapshot);

  return (
    <section className="print-section">
      <h3 className="print-section-title">{title}</h3>
      {entries.length === 0 ? (
        <p className="print-muted">No visual design details selected.</p>
      ) : compact ? (
        <p className="print-meta-box print-value">{summary}</p>
      ) : (
        <dl className="print-two-column design-sheet-print-grid">
          {entries.map((entry) => (
            <div key={entry.key} className="print-meta-box">
              <dt className="print-label">{entry.label}</dt>
              <dd className="print-value">{entry.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
