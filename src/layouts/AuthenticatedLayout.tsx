import { LogOut, Menu } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/authContext';
import { useShop } from '../features/shop/shopContext';
import { appEnv } from '../lib/env';
import { appLogoIcon as LogoIcon, appNavigation, type NavigationItem } from '../routes/navigation';
import { cn } from '../utils/cn';

export function AuthenticatedLayout() {
  const { signOut, user } = useAuth();
  const { currentShop, currentShopId, hasMultipleShops, memberships, setCurrentShopId } = useShop();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <div className="flex items-center gap-3 px-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-600 text-white">
            <LogoIcon aria-hidden="true" className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{appEnv.appName}</p>
            <p className="truncate text-xs text-slate-500">{currentShop?.name ?? 'Asia/Dhaka - BDT'}</p>
          </div>
        </div>
        <nav className="mt-8 space-y-1">
          {appNavigation.map((item) => (
            <DesktopNavItem key={item.to} item={item} />
          ))}
        </nav>
      </aside>

      <div className="min-w-0 pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur no-print lg:static">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 lg:px-8">
            <div className="flex min-w-0 items-center gap-3 lg:hidden">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white">
                <LogoIcon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{appEnv.appName}</p>
                <p className="truncate text-xs text-slate-500">{currentShop?.name ?? 'Shop management'}</p>
              </div>
            </div>
            <div className="hidden min-w-0 items-center gap-3 text-sm text-slate-500 lg:flex">
              <Menu aria-hidden="true" className="h-4 w-4 flex-none" />
              {hasMultipleShops ? (
                <select
                  aria-label="Select shop"
                  value={currentShopId ?? ''}
                  onChange={(event) => setCurrentShopId(event.target.value)}
                  className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                >
                  {memberships.map((membership) => (
                    <option key={membership.shop_id} value={membership.shop_id}>
                      {membership.shop.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="truncate font-medium text-slate-700">{currentShop?.name ?? 'Current shop'}</span>
              )}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="hidden max-w-56 truncate rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 sm:block">
                {user?.email ?? 'Signed out'}
              </span>
              {user ? (
                <button
                  type="button"
                  title="Sign out"
                  onClick={() => void signOut()}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-panel transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                >
                  <LogOut aria-hidden="true" className="h-5 w-5" />
                </button>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-5 sm:py-8 lg:px-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-slate-200 bg-white no-print lg:hidden">
        {appNavigation.map((item) => (
          <MobileNavItem key={item.to} item={item} />
        ))}
      </nav>
    </div>
  );
}

function DesktopNavItem({ item }: { item: NavigationItem }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
          isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
        )
      }
    >
      <Icon aria-hidden="true" className="h-5 w-5" />
      {item.label}
    </NavLink>
  );
}

function MobileNavItem({ item }: { item: NavigationItem }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'flex min-h-16 min-w-20 flex-1 flex-col items-center justify-center gap-1 px-2 text-[11px] font-medium',
          isActive ? 'text-brand-700' : 'text-slate-500',
        )
      }
    >
      <Icon aria-hidden="true" className="h-5 w-5" />
      <span className="max-w-full truncate">{item.label}</span>
    </NavLink>
  );
}
