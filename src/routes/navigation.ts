import {
  BarChart3,
  Banknote,
  ClipboardList,
  Gauge,
  PackageCheck,
  Search,
  Scissors,
  Settings,
  Shirt,
  type LucideIcon,
} from 'lucide-react';

export type NavigationItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export const appNavigation: NavigationItem[] = [
  { to: '/orders/new', label: 'New Order', icon: Scissors },
  { to: '/token-search', label: 'Search / Delivery', icon: Search },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/production', label: 'Production', icon: Shirt },
  { to: '/payments', label: 'Payments', icon: Banknote },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/dashboard', label: 'Dashboard', icon: Gauge },
];

export const deliveryNavigationItem: NavigationItem = { to: '/deliveries', label: 'Delivery Queue', icon: PackageCheck };

export const appLogoIcon = Scissors;