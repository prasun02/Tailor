export function StyleBadges({ styles }: { styles: string[] }) {
  if (styles.length === 0) {
    return <p className="text-sm text-slate-500">No style options selected.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {styles.map((style) => (
        <li key={style} className="max-w-full rounded-lg border border-accent-100 bg-accent-50 px-3 py-1.5 text-sm font-semibold text-brand-900">
          <span className="break-words">{style}</span>
        </li>
      ))}
    </ul>
  );
}