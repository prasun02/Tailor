import type { ShopRole } from '../types/database';

export const ADMIN_ROLES: ShopRole[] = ['owner', 'manager'];
export const ORDER_ENTRY_ROLES: ShopRole[] = ['owner', 'manager', 'staff'];
export const SEARCH_DELIVERY_ROLES: ShopRole[] = ['owner', 'manager', 'staff', 'cutter', 'tailor', 'viewer'];
export const PRODUCTION_ROLES: ShopRole[] = ['owner', 'manager', 'cutter', 'tailor'];
export const CUSTOMER_TOKEN_PRINT_ROLES: ShopRole[] = SEARCH_DELIVERY_ROLES;
export const PRODUCTION_PRINT_ROLES: ShopRole[] = PRODUCTION_ROLES;
export const STORE_PRINT_ROLES: ShopRole[] = ADMIN_ROLES;

const CUSTOMER_MANAGEMENT_ROLES: ShopRole[] = ['owner', 'manager', 'staff'];
const CUSTOMER_ARCHIVE_ROLES: ShopRole[] = ADMIN_ROLES;
const ARCHIVE_VISIBILITY_ROLES: ShopRole[] = ADMIN_ROLES;
const CONFIGURATION_MANAGEMENT_ROLES: ShopRole[] = ADMIN_ROLES;
const MEASUREMENT_CREATION_ROLES: ShopRole[] = ['owner', 'manager', 'staff', 'cutter', 'tailor'];
const ORDER_CREATION_ROLES: ShopRole[] = ORDER_ENTRY_ROLES;
const PAYMENT_ROLES: ShopRole[] = ADMIN_ROLES;
const PAYMENT_VOID_ROLES: ShopRole[] = ADMIN_ROLES;
const WORKER_ASSIGNMENT_ROLES: ShopRole[] = ADMIN_ROLES;

export function hasAnyRole(role: ShopRole | null | undefined, allowedRoles: ReadonlyArray<ShopRole>): boolean {
  return Boolean(role && allowedRoles.includes(role));
}

export function defaultPathForRole(role: ShopRole | null | undefined): string {
  if (hasAnyRole(role, ADMIN_ROLES)) return '/dashboard';
  if (hasAnyRole(role, PRODUCTION_ROLES)) return '/production';
  if (hasAnyRole(role, ORDER_ENTRY_ROLES)) return '/orders/new';
  if (hasAnyRole(role, SEARCH_DELIVERY_ROLES)) return '/token-search';
  return '/membership-suspended';
}

export function canSearchAndDeliver(role: ShopRole | null | undefined): boolean {
  return hasAnyRole(role, SEARCH_DELIVERY_ROLES);
}

export function canViewDashboard(role: ShopRole | null | undefined): boolean {
  return hasAnyRole(role, ADMIN_ROLES);
}

export function canViewOrders(role: ShopRole | null | undefined): boolean {
  return hasAnyRole(role, ADMIN_ROLES);
}

export function canViewProduction(role: ShopRole | null | undefined): boolean {
  return hasAnyRole(role, PRODUCTION_ROLES);
}

export function canViewReports(role: ShopRole | null | undefined): boolean {
  return hasAnyRole(role, ADMIN_ROLES);
}

export function canViewSettings(role: ShopRole | null | undefined): boolean {
  return hasAnyRole(role, ADMIN_ROLES);
}

export function canManageCustomers(role: ShopRole | null | undefined): boolean {
  return hasAnyRole(role, CUSTOMER_MANAGEMENT_ROLES);
}

export function canArchiveCustomers(role: ShopRole | null | undefined): boolean {
  return hasAnyRole(role, CUSTOMER_ARCHIVE_ROLES);
}

export function canRestoreCustomers(role: ShopRole | null | undefined): boolean {
  return canArchiveCustomers(role);
}

export function canViewArchivedCustomers(role: ShopRole | null | undefined): boolean {
  return hasAnyRole(role, ARCHIVE_VISIBILITY_ROLES);
}

export function canManageConfiguration(role: ShopRole | null | undefined): boolean {
  return hasAnyRole(role, CONFIGURATION_MANAGEMENT_ROLES);
}

export function canCreateMeasurements(role: ShopRole | null | undefined): boolean {
  return hasAnyRole(role, MEASUREMENT_CREATION_ROLES);
}

export function canCreateOrders(role: ShopRole | null | undefined): boolean {
  return hasAnyRole(role, ORDER_CREATION_ROLES);
}

export function canRecordPayments(role: ShopRole | null | undefined): boolean {
  return hasAnyRole(role, PAYMENT_ROLES);
}

export function canVoidPayments(role: ShopRole | null | undefined): boolean {
  return hasAnyRole(role, PAYMENT_VOID_ROLES);
}

export function canArchiveOrders(role: ShopRole | null | undefined): boolean {
  return hasAnyRole(role, PAYMENT_VOID_ROLES);
}

export function canAssignWorkers(role: ShopRole | null | undefined): boolean {
  return hasAnyRole(role, WORKER_ASSIGNMENT_ROLES);
}
