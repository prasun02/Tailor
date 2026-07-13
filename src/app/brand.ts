export const appBrand = {
  name: 'Faabrico',
  subtitle: 'Bespoke Tailoring Order & Production Desk',
  description: 'Premium Bespoke Tailoring Management',
  phone: '+880 1714-793555',
  address: '5th Floor, Lake Manor, House 9 Rd 35, Gulshan 2, Dhaka',
  timezoneCurrency: 'Asia/Dhaka - BDT',
  logoUrl: '',
} as const;

export function brandInitials(name: string = appBrand.name): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (words.length === 0) {
    return 'F';
  }

  return words.map((word) => word[0]?.toUpperCase() ?? '').join('');
}
