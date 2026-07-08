import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShopProvider } from './ShopProvider';
import { useShop } from './shopContext';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('../auth/authContext', () => ({
  useAuth: () => ({
    isConfigured: true,
    user: { id: 'user-1', email: 'owner@example.com' },
  }),
}));

vi.mock('../../services/supabaseClient', () => ({
  getSupabaseClient: () => ({
    rpc: mocks.rpc,
  }),
}));

function MembershipProbe() {
  const { hasSuspendedMembership, inactiveMemberships, isLoading, memberships } = useShop();

  if (isLoading) {
    return <div>Loading memberships</div>;
  }

  return (
    <div>
      <span>active {memberships.length}</span>
      <span>inactive {inactiveMemberships.length}</span>
      <span>suspended {hasSuspendedMembership ? 'yes' : 'no'}</span>
      <span>{inactiveMemberships[0]?.shop.name}</span>
    </div>
  );
}

function renderShopProvider() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ShopProvider>
        <MembershipProbe />
      </ShopProvider>
    </QueryClientProvider>,
  );
}

describe('ShopProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.rpc.mockReset();
  });

  it('preserves inactive memberships so suspended users are not treated as new users', async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          shop_id: 'shop-1',
          user_id: 'user-1',
          role: 'staff',
          is_active: false,
          shop_name: 'Nipun Tailors',
          timezone: 'Asia/Dhaka',
          currency: 'BDT',
          default_measurement_unit: 'inch',
        },
      ],
      error: null,
    });

    renderShopProvider();

    expect(await screen.findByText('active 0')).toBeInTheDocument();
    expect(screen.getByText('inactive 1')).toBeInTheDocument();
    expect(screen.getByText('suspended yes')).toBeInTheDocument();
    expect(screen.getByText('Nipun Tailors')).toBeInTheDocument();
  });
});
