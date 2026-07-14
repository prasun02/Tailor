/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('tailor order flow migration safeguards', () => {
  const migrationSql = readFileSync(join(process.cwd(), 'supabase/migrations/0005_tailor_order_flow_improvements.sql'), 'utf8');
  const designMigrationSql = readFileSync(join(process.cwd(), 'supabase/migrations/0006_design_preview_flow.sql'), 'utf8');
  const dashboardRepairMigrationSql = readFileSync(join(process.cwd(), 'supabase/migrations/0009_tailor_dashboard_metrics_rpc.sql'), 'utf8');

  it('confirms delivery through a security definer function with due-balance checks', () => {
    expect(migrationSql).toContain('create or replace function public.confirm_order_delivery');
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public, pg_temp');
    expect(migrationSql).toContain('Due amount must be paid before delivery.');
    expect(migrationSql).toContain('insert into public.order_status_history');
    expect(migrationSql).toContain('grant execute on function public.confirm_order_delivery(uuid, uuid, text) to authenticated');
  });

  it('keeps dashboard metrics shop-scoped and authenticated', () => {
    expect(dashboardRepairMigrationSql).toContain('create or replace function public.get_tailor_dashboard_metrics');
    expect(dashboardRepairMigrationSql).toContain('security definer');
    expect(dashboardRepairMigrationSql).toContain('set search_path = public, pg_temp');
    expect(dashboardRepairMigrationSql).toContain('public.is_active_shop_member(target_shop_id, auth.uid())');
    expect(dashboardRepairMigrationSql).toContain('customer.shop_id = target_shop_id');
    expect(dashboardRepairMigrationSql).toContain("notify pgrst, 'reload schema'");
    expect(dashboardRepairMigrationSql).toContain('grant execute on function public.get_tailor_dashboard_metrics(uuid) to authenticated');
  });

  it('adds design preview tables with RLS and secure order snapshot validation', () => {
    expect(designMigrationSql).toContain('create table public.garment_designs');
    expect(designMigrationSql).toContain('shop_id uuid not null');
    expect(designMigrationSql).toContain('design_name text not null');
    expect(designMigrationSql).toContain('design_code text not null');
    expect(designMigrationSql).toContain('fabric_reference_url text');
    expect(designMigrationSql).toContain('alter table public.garment_designs enable row level security');
    expect(designMigrationSql).toContain('active members can view active garment designs');
    expect(designMigrationSql).toContain("public.has_shop_role(shop_id, array['owner', 'manager']::public.shop_role[])");
    expect(designMigrationSql).toContain('garment_designs_active_code_per_shop_idx');
    expect(designMigrationSql).toContain('item_design_snapshot := coalesce');
    expect(designMigrationSql).toContain('Selected design was not found for this shop and garment.');
    expect(designMigrationSql).toContain('grant execute on function public.create_order_with_items(uuid, uuid, jsonb) to authenticated');
    expect(designMigrationSql).toContain("notify pgrst, 'reload schema'");
  });
});
