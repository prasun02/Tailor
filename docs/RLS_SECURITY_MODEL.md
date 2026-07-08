# RLS Security Model

The initial schema uses shop-scoped Row-Level Security for all business tables.

## Membership Helpers

Policies call SECURITY DEFINER helper functions to avoid recursive RLS checks on `shop_members`:

- `is_active_shop_member(shop_id, user_id default auth.uid())`
- `has_shop_role(shop_id, allowed_roles, user_id default auth.uid())`
- `current_user_shop_ids()`
- `get_current_user_shop_memberships()`

Each SECURITY DEFINER function sets `search_path` and validates authenticated context where required. `get_current_user_shop_memberships()` is a `SECURITY INVOKER` function, so normal RLS still applies while the RPC returns only active rows for `auth.uid()`.

## Role Model

Roles are:

- `owner`
- `manager`
- `staff`
- `cutter`
- `tailor`
- `viewer`

Owners and managers can manage shop configuration and memberships. Staff can manage customers, measurements, and orders through permitted table access and secure RPCs. Cutters and tailors can work with assigned production items through secure status changes. Viewers have read-only access to permitted shop records.

## Access Rules

- Users can only see shops where they have active membership.
- Users can load only their own active memberships through `get_current_user_shop_memberships()`.
- Users can only see their own profile row.
- Owners and managers can update shop records and manage most configuration data.
- Users cannot update their own membership row, preventing self-role changes.
- Customers are soft-deleted and shop-scoped.
- Measurement values are immutable; new versions must be created instead.
- Payments cannot be deleted. Voiding stores reason, user, and time.
- Audit logs are read-only for owner/manager roles and cannot be changed by normal users.
- Anonymous users receive no business-table grants.

## RPC-Only Sensitive Mutations

Direct table writes are intentionally not granted for sensitive workflows that must be validated atomically:

- Measurement version creation
- Order creation with items
- Payment recording
- Order item status changes
- Payment voiding
- Dashboard metrics

These are handled by SECURITY DEFINER RPCs that validate membership, role, ownership, input shape, totals, snapshots, and status rules inside PostgreSQL.

## Why This Avoids RLS Recursion

Policies do not directly query `shop_members`. They call stable SECURITY DEFINER helpers, and those helpers query `shop_members` with an explicit `search_path`. This avoids the classic recursive policy problem where a membership policy tries to query the same protected membership table.
