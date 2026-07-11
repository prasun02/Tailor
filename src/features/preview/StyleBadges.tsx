export function StyleBadges({ styles }: { styles: string[] }) {
  if (styles.length === 0) {
    return <p className="text-sm text-slate-500">No style options selected.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {styles.map((style) => (
        <li key={style} className="max-w-full rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-800">
          <span className="break-words">{style}</span>
        </li>
      ))}
    </ul>
  );
}
