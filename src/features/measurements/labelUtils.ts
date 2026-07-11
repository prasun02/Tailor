export function cleanLocalizedLabel(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';

  if (!trimmed || /\?{2,}/.test(trimmed) || /\uFFFD/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export function displayFieldLabel(label: string, labelBn: string | null | undefined): string {
  const primaryLabel = label.trim() || 'Field';
  const localizedLabel = cleanLocalizedLabel(labelBn);

  return localizedLabel ? `${primaryLabel} / ${localizedLabel}` : primaryLabel;
}
