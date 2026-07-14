import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';

const mocks = vi.hoisted(() => ({
  metricsQuery: {
    data: null as unknown,
    isLoading: false,
    isError: false,
    error: null as Error | null,
  },
  worklistsQuery: {
    data: null as unknown,
    isLoading: false,
  },
}));

vi.mock('../features/shop/shopContext', () => ({
  useShop: () => ({ currentShopId: 'shop-1' }),
}));

vi.mock('../features/orders/orderHooks', () => ({
  useTailorDashboardMetrics: () => mocks.metricsQuery,
  useDashboardWorklists: () => mocks.worklistsQuery,
}));

beforeEach(() => {
  mocks.metricsQuery.data = null;
  mocks.metricsQuery.isLoading = false;
  mocks.metricsQuery.isError = false;
  mocks.metricsQuery.error = null;
  mocks.worklistsQuery.data = null;
  mocks.worklistsQuery.isLoading = false;
});

describe('DashboardPage', () => {
  it('shows the dashboard RPC error clearly', () => {
    mocks.metricsQuery.isError = true;
    mocks.metricsQuery.error = new Error('Could not find the function public.get_tailor_dashboard_metrics(target_shop_id) in the schema cache');

    render(<DashboardPage />, { wrapper: MemoryRouter });

    expect(screen.getByText('Could not load metrics')).toBeInTheDocument();
    expect(screen.getByText(/get_tailor_dashboard_metrics/)).toBeInTheDocument();
  });

  it('renders Faabrico metrics including customer and active production counts', () => {
    mocks.metricsQuery.data = {
      newOrdersToday: 1,
      deliveryToday: 2,
      deliveryTomorrow: 3,
      overdueOrders: 0,
      readyForDelivery: 4,
      itemsInCutting: 5,
      itemsInStitching: 6,
      itemsInFinishing: 7,
      totalDueAmount: 800,
      salesThisMonth: 1200,
      ordersThisMonth: 9,
      customerCount: 20,
      productionActiveCount: 11,
    };

    render(<DashboardPage />, { wrapper: MemoryRouter });

    expect(screen.getByRole('heading', { name: 'Faabrico Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('Active production')).toBeInTheDocument();
    expect(screen.queryByText(/Tailor Store Manager/)).not.toBeInTheDocument();
  });
});
