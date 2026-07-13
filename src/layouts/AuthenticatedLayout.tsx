import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/authContext';
import { useShop } from '../features/shop/shopContext';
import { appEnv } from '../lib/env';
import { appLogoIcon as LogoIcon, appNavigation, type NavigationItem } from '../routes/navigation';
import { cn } from '../utils/cn';

export function AuthenticatedLayout() {
  const { signOut, user } = useAuth();
  const { currentShop, currentShopId, hasMultipleShops, memberships, setCurrentShopId } = useShop();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F5EF] text-slate-950 lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-brand-200 bg-white px-3 py-5 lg:block">
        <BrandLockup shopName={currentShop?.name ?? 'Asia/Dhaka - BDT'} />
        <nav className="mt-7 space-y-1" aria-label="Main navigation">
          {appNavigation.map((item) => (
            <DesktopNavItem key={item.to} item={item} />
          ))}
        </nav>
        <div className="absolute inset-x-3 bottom-4 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-slate-600">
          <p className="truncate font-semibold text-slate-800">{user?.email ?? 'Signed out'}</p>
          <p className="mt-1">Asia/Dhaka - BDT</p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-brand-200 bg-white/95 backdrop-blur no-print lg:static">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-200 bg-white text-slate-700 shadow-panel lg:hidden"
                aria-label="Open navigation"
              >
                <Menu aria-hidden="true" className="h-5 w-5" />
              </button>
              <div className="lg:hidden">
                <BrandLockup compact shopName={currentShop?.name ?? 'Shop management'} />
              </div>
              <div className="hidden min-w-0 items-center gap-3 text-sm text-slate-500 lg:flex">
                <Menu aria-hidden="true" className="h-4 w-4 flex-none" />
                {hasMultipleShops ? (
                  <select
                    aria-label="Select shop"
                    value={currentShopId ?? ''}
                    onChange={(event) => setCurrentShopId(event.target.value)}
                    className="min-h-10 rounded-lg border border-brand-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
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
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="hidden max-w-56 truncate rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-slate-600 sm:block">
                {user?.email ?? 'Signed out'}
              </span>
              {user ? (
                <button
                  type="button"
                  title="Sign out"
                  onClick={() => void signOut()}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-brand-200 bg-white text-slate-700 shadow-panel transition hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-600"
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

      {isMobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Mobile navigation">
          <button type="button" className="absolute inset-0 bg-slate-950/40" aria-label="Close navigation" onClick={() => setIsMobileNavOpen(false)} />
          <aside className="relative flex h-full w-[min(19rem,88vw)] flex-col border-r border-brand-200 bg-white px-4 py-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <BrandLockup shopName={currentShop?.name ?? 'Shop management'} />
              <button type="button" onClick={() => setIsMobileNavOpen(false)} title="Close navigation" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-7 space-y-1" aria-label="Mobile main navigation">
              {appNavigation.map((item) => (
                <DesktopNavItem key={item.to} item={item} onNavigate={() => setIsMobileNavOpen(false)} />
              ))}
            </nav>
            <div className="mt-auto rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-slate-600">
              <p className="truncate font-semibold text-slate-800">{user?.email ?? 'Signed out'}</p>
              <p className="mt-1">Asia/Dhaka - BDT</p>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function BrandLockup({ shopName, compact = false }: { shopName: string; compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={cn('flex items-center justify-center rounded-lg bg-brand-600 text-white', compact ? 'h-10 w-10' : 'h-11 w-11')}>
        <LogoIcon aria-hidden="true" className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-950">{appEnv.appName}</p>
        <p className="truncate text-xs text-slate-500">{shopName}</p>
      </div>
    </div>
  );
}

function DesktopNavItem({ item, onNavigate }: { item: NavigationItem; onNavigate?: () => void }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition',
          isActive ? 'bg-brand-50 text-brand-900 ring-1 ring-brand-200' : 'text-slate-600 hover:bg-brand-50 hover:text-slate-950',
        )
      }
    >
      <Icon aria-hidden="true" className="h-5 w-5" />
      {item.label}
    </NavLink>
  );
}