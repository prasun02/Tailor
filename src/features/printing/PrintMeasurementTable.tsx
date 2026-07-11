import { snapshotEntries } from './printModel';

type PrintMeasurementTableProps = {
  values: Record<string, unknown>;
  title?: string;
};

export function PrintMeasurementTable({ values, title = 'Measurements' }: PrintMeasurementTableProps) {
  const entries = snapshotEntries(values);

  return (
    <section className="print-section">
      <h3 className="print-section-title">{title}</h3>
      {entries.length === 0 ? (
        <p className="print-muted">No measurement snapshot.</p>
      ) : (
        <table className="print-table">
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.key}>
                <th scope="row">{entry.label}</th>
                <td>{entry.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
