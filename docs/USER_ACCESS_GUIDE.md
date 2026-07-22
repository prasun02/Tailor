# User Access Guide

Faabrico uses Supabase Auth for login and `shop_members` for shop-level access. Do not put service-role keys in the frontend. The app should only use `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Admin Setup

1. Go to Supabase Authentication -> Users.
2. Invite or create the staff user email.
3. Set a temporary password or send the invite link.
4. Add or update the matching row in `shop_members` for the correct `shop_id` and `user_id`.
5. Assign one of the existing roles: `owner`, `manager`, `staff`, `cutter`, `tailor`, or `viewer`.
6. Keep `is_active = true` for active staff.
7. Ask the user to log in with email/password.
8. The app filters menus and protects routes from the active `shop_members.role`.

## Role Mapping

| Business user type | Existing role value | Access |
| --- | --- | --- |
| Admin / Owner | `owner` | New Order, Search / Delivery, Orders, Production, Payments, Reports, Settings, Dashboard |
| Manager | `manager` | New Order, Search / Delivery, Orders, Production, Payments, Reports |
| Order User | `staff` | New Order, Search / Delivery |
| Production User | `cutter` or `tailor` | Production, Search / Delivery |
| Delivery User | `viewer` | Search / Delivery |

## Direct Staff Creation

The browser app cannot safely create Supabase Auth users directly because that requires Auth admin privileges. Use Supabase Authentication first, then assign the role through `shop_members`.

## SQL Verification Examples

Check a user's membership:

```sql
select shop_id, user_id, role, is_active, created_at, updated_at
from public.shop_members
where shop_id = '<shop_id>'
order by created_at desc;
```

Activate, deactivate, or change a role as an owner/manager under RLS:

```sql
update public.shop_members
set role = 'staff', is_active = true
where shop_id = '<shop_id>'
  and user_id = '<user_id>';
```

Verify the app-visible membership RPC:

```sql
select *
from public.get_current_user_shop_memberships();
```

Never run SQL with service-role credentials in the frontend or expose secrets in Vite environment variables.