import type { ShopRole } from '../types/database';

const CUSTOMER_MANAGEMENT_ROLES: ShopRole[] = ['owner', 'manager', 'staff'];
const CUSTOMER_ARCHIVE_ROLES: ShopRole[] = ['owner', 'manager'];
const ARCHIVE_VISIBILITY_ROLES: ShopRole[] = ['owner', 'manager'];
const CONFIGURATION_MANAGEMENT_ROLES: ShopRole[] = ['owner', 'manager'];
const MEASUREMENT_CREATION_ROLES: ShopRole[] = ['owner', 'manager', 'staff', 'cutter', 'tailor'];
const ORDER_CREATION_ROLES: ShopRole[] = ['owner', 'manager', 'staff'];
const PAYMENT_ROLES: ShopRole[] = ['owner', 'manager', 'staff'];
const PAYMENT_VOID_ROLES: ShopRole[] = ['owner', 'manager'];
const WORKER_ASSIGNMENT_ROLES: ShopRole[] = ['owner', 'manager'];

export function hasAnyRole(role: ShopRole | null | undefined, allowedRoles: ShopRole[]): boolean {
  return Boolean(role && allowedRoles.includes(role));
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
