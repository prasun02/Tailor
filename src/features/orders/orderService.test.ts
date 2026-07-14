import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTailorDashboardMetrics } from './orderService';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('../../services/supabaseClient', () => ({
  getSupabaseClient: () => ({
    rpc: mocks.rpc,
  }),
}));

beforeEach(() => {
  mocks.rpc.mockReset();
});

describe('getTailorDashboardMetrics', () => {
  it('calls the shop-scoped RPC and maps frontend keys plus compatibility aliases', async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        orders_today: 2,
        deliveries_today: 3,
        deliveries_tomorrow: 4,
        overdue_orders: 1,
        ready_for_delivery: 5,
        cutting_count: 6,
        stitching_count: 7,
        finishing_count: 8,
        total_due_amount: '900',
        monthly_sales: '12000',
        monthly_order_count: 9,
        customer_count: 20,
        production_active_count: 12,
      },
      error: null,
    });

    await expect(getTailorDashboardMetrics('shop-1')).resolves.toEqual({
      newOrdersToday: 2,
      deliveryToday: 3,
      deliveryTomorrow: 4,
      overdueOrders: 1,
      readyForDelivery: 5,
      itemsInCutting: 6,
      itemsInStitching: 7,
      itemsInFinishing: 8,
      totalDueAmount: 900,
      salesThisMonth: 12000,
      ordersThisMonth: 9,
      customerCount: 20,
      productionActiveCount: 12,
    });
    expect(mocks.rpc).toHaveBeenCalledWith('get_tailor_dashboard_metrics', { target_shop_id: 'shop-1' });
  });

  it('surfaces dashboard RPC errors instead of hiding them', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'Function missing' } });

    await expect(getTailorDashboardMetrics('shop-1')).rejects.toThrow('Function missing');
  });
});
