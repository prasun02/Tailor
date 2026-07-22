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
import type { ShopRole } from '../types/database';
import {
  ADMIN_ROLES,
  ORDER_ENTRY_ROLES,
  PRODUCTION_ROLES,
  SEARCH_DELIVERY_ROLES,
  hasAnyRole,
} from '../utils/authorization';

export type NavigationItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  allowedRoles: ShopRole[];
};

export const appNavigation: NavigationItem[] = [
  { to: '/orders/new', label: 'New Order', icon: Scissors, allowedRoles: ORDER_ENTRY_ROLES },
  { to: '/token-search', label: 'Search / Delivery', icon: Search, allowedRoles: SEARCH_DELIVERY_ROLES },
  { to: '/orders', label: 'Orders', icon: ClipboardList, allowedRoles: ADMIN_ROLES },
  { to: '/production', label: 'Production', icon: Shirt, allowedRoles: PRODUCTION_ROLES },
  { to: '/payments', label: 'Payments', icon: Banknote, allowedRoles: ADMIN_ROLES },
  { to: '/reports', label: 'Reports', icon: BarChart3, allowedRoles: ADMIN_ROLES },
  { to: '/settings', label: 'Settings', icon: Settings, allowedRoles: ADMIN_ROLES },
  { to: '/dashboard', label: 'Dashboard', icon: Gauge, allowedRoles: ADMIN_ROLES },
];

export const deliveryNavigationItem: NavigationItem = { to: '/deliveries', label: 'Delivery Queue', icon: PackageCheck, allowedRoles: SEARCH_DELIVERY_ROLES };

export function navigationForRole(role: ShopRole | null | undefined): NavigationItem[] {
  return appNavigation.filter((item) => hasAnyRole(role, item.allowedRoles));
}

export const appLogoIcon = Scissors;
