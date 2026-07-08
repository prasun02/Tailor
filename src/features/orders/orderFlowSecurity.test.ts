/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('tailor order flow migration safeguards', () => {
  const migrationSql = readFileSync(join(process.cwd(), 'supabase/migrations/0005_tailor_order_flow_improvements.sql'), 'utf8');

  it('confirms delivery through a security definer function with due-balance checks', () => {
    expect(migrationSql).toContain('create or replace function public.confirm_order_delivery');
    expect(migrationSql).toContain('security definer');
    expect(migrationSql).toContain('set search_path = public, pg_temp');
    expect(migrationSql).toContain('Due amount must be paid before delivery.');
    expect(migrationSql).toContain('insert into public.order_status_history');
    expect(migrationSql).toContain('grant execute on function public.confirm_order_delivery(uuid, uuid, text) to authenticated');
  });

  it('keeps dashboard metrics shop-scoped and authenticated', () => {
    expect(migrationSql).toContain('create or replace function public.get_tailor_dashboard_metrics');
    expect(migrationSql).toContain('public.is_active_shop_member(target_shop_id)');
    expect(migrationSql).toContain('where orders.shop_id = target_shop_id');
  });
});
