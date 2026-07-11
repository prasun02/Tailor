import { snapshotEntries } from './printModel';

type PrintStyleSummaryProps = {
  values: Record<string, unknown>;
  title?: string;
};

export function PrintStyleSummary({ values, title = 'Style Options' }: PrintStyleSummaryProps) {
  const entries = snapshotEntries(values);

  return (
    <section className="print-section">
      <h3 className="print-section-title">{title}</h3>
      {entries.length === 0 ? (
        <p className="print-muted">No style snapshot.</p>
      ) : (
        <dl className="print-two-column">
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
