function toAsciiDigit(char: string): string {
  const code = char.charCodeAt(0);

  if (code >= 0x09e6 && code <= 0x09ef) {
    return String(code - 0x09e6);
  }

  if (code >= 0x0660 && code <= 0x0669) {
    return String(code - 0x0660);
  }

  if (code >= 0x06f0 && code <= 0x06f9) {
    return String(code - 0x06f0);
  }

  return char;
}

export function normalizeDigits(value: string): string {
  return value.split('').map(toAsciiDigit).join('');
}

export function normalizePhone(value: string | null | undefined): string | null {
  const digits = normalizeDigits(value ?? '').replace(/\D/g, '');
  return digits || null;
}

export function normalizePhoneInput(value: string | null | undefined): string | null {
  const normalized = normalizeDigits(value ?? '').trim();
  return normalized ? normalized : null;
}

export function isValidPhone(value: string | null | undefined): boolean {
  const phone = normalizePhone(value);

  if (!phone) {
    return false;
  }

  return phone.length >= 7 && phone.length <= 15;
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function optionalTrimmed(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
}

export function formatPhoneForDisplay(value: string | null | undefined): string {
  return value?.trim() || 'No phone';
}
