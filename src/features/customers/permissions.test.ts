import { describe, expect, it } from 'vitest';
import { canArchiveCustomers, canManageCustomers, canRestoreCustomers, canViewArchivedCustomers } from '../../utils/authorization';

describe('customer permissions', () => {
  it('allows owner and manager to view archived customers and restore records', () => {
    expect(canViewArchivedCustomers('owner')).toBe(true);
    expect(canViewArchivedCustomers('manager')).toBe(true);
    expect(canRestoreCustomers('owner')).toBe(true);
    expect(canRestoreCustomers('manager')).toBe(true);
  });

  it('allows staff to manage active customer records but not archive visibility', () => {
    expect(canManageCustomers('staff')).toBe(true);
    expect(canArchiveCustomers('staff')).toBe(false);
    expect(canViewArchivedCustomers('staff')).toBe(false);
  });

  it('keeps viewer and production roles read-oriented in the UI', () => {
    expect(canManageCustomers('viewer')).toBe(false);
    expect(canManageCustomers('cutter')).toBe(false);
    expect(canManageCustomers('tailor')).toBe(false);
  });
});
