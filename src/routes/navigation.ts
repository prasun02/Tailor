import {
  BarChart3,
  Banknote,
  ClipboardList,
  PackageCheck,
  Gauge,
  Search,
  Ruler,
  Scissors,
  Settings,
  Shirt,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

export type NavigationItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export const appNavigation: NavigationItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: Gauge },
  { to: '/orders/new', label: 'New Order Entry', icon: Scissors },
  { to: '/token-search', label: 'Token / Customer Search', icon: Search },
  { to: '/customers', label: 'Customers', icon: UsersRound },
  { to: '/measurements', label: 'Measurements', icon: Ruler },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/production', label: 'Production Board', icon: Shirt },
  { to: '/deliveries', label: 'Delivery', icon: PackageCheck },
  { to: '/payments', label: 'Payments / Due', icon: Banknote },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const appLogoIcon = Scissors;
