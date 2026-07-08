# Database Schema

This phase adds the first Supabase PostgreSQL migration:

`supabase/migrations/0001_initial_schema.sql`

The schema is multi-shop-ready and assumes one shop for the first MVP installation.

## Core Tables

- `profiles`: one row per Supabase Auth user.
- `shops`: tailor shop records with timezone, currency, measurement unit, soft deletion, and creator.
- `shop_members`: active shop memberships and roles. The composite key is `(shop_id, user_id)`.
- `shop_counters`: atomic counters for future customer and order numbering.
- `garment_types`: shop-configured garment categories such as Shirt, Pant, Panjabi, Suit, Blazer, Pajama, Waistcoat, and Other.
- `measurement_fields`: configurable physical measurement fields by garment type.
- `style_fields`: configurable style-choice fields by garment type.
- `customers`: shop-scoped customers with normalized search fields and soft deletion.
- `measurement_sets`: immutable customer measurement versions.
- `orders`: order headers with database-calculated totals.
- `order_items`: individual garments in an order with immutable measurement and style snapshots.
- `payments`: append-only payment history with void metadata.
- `order_status_history`: order and item status audit trail.
- `audit_logs`: security and business-operation audit events.

## Enums

The migration creates enums for shop roles, measurement and style field types, measurement units, order priority, overall order status, production status, payment method, and payment status.

## Important Constraints

- Active customer phone numbers are unique per shop when a normalized phone exists.
- Measurement versions are unique by shop, customer, garment type, and version number.
- Only one current measurement set is allowed per shop, customer, and garment type.
- Order totals must equal `subtotal - discount_amount`.
- Order item line totals are recalculated by trigger from quantity and unit price.
- Payments cannot be deleted; they must be voided.
- Measurement values cannot be updated or deleted.

## Business Functions

- `create_shop_with_owner`: creates or reuses the owner's shop, creates profile data, adds owner membership, creates counters, and seeds garment, measurement, and style defaults.
- `create_measurement_version`: validates membership and ownership, locks the customer-garment measurement stream, increments the version, marks old versions not current, and inserts the new version.
- `create_order_with_items`: validates JSON input, recalculates all money values, generates an order number, snapshots measurements/styles, inserts items, optionally records an advance payment, and writes status history.
- `record_order_payment`: validates role and due amount, rejects unauthorized overpayment, inserts payment, and returns paid/due totals.
- `change_order_item_status`: validates role, assignment, and transition rules, updates item status, writes history, and updates overall order status.
- `void_order_payment`: owner/manager-only voiding without deleting payment history.
- `get_dashboard_metrics`: returns shop-scoped delivery, production, balance, and monthly totals.

## Seeded Defaults

`create_shop_with_owner` seeds practical garment types, shirt/pant/Panjabi/suit measurement fields, and style fields. More fields can be added later by owner/manager roles.