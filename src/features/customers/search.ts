export function escapePostgrestPattern(value: string): string {
  return value.replace(/[%,()]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeCustomerSearch(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}
