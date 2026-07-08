export function formatMeasuredBy(userId: string | null | undefined): string {
  return userId ? `User ${userId.slice(0, 8)}` : 'Not recorded';
}

export function sortedValueKeys(...valueObjects: Record<string, unknown>[]): string[] {
  return Array.from(new Set(valueObjects.flatMap((valueObject) => Object.keys(valueObject)))).sort((left, right) => left.localeCompare(right));
}
