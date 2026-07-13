import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { appBrand } from '../app/brand';
import { BrandMark } from '../components/BrandMark';
import { useAuth } from '../features/auth/authContext';
import { useShop } from '../features/shop/shopContext';
import { resolveShopBrand, useShopBrand } from '../features/printing/useShopBrand';
import type { ShopBrand } from '../features/printing/printModel';
import { appNavigation, type NavigationItem } from '../routes/navigation';
import { cn } from '../utils/cn';

export function AuthenticatedLayout() {
  const { signOut, user } = useAuth();
  const { currentShop, currentShopId, hasMultipleShops, memberships, setCurrentShopId } = useShop();
  const brandQuery = useShopBrand(currentShopId, currentShop);
  const shellBrand = resolveShopBrand(brandQuery.data, currentShop);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-50 text-slate-950 lg:grid lg:grid-cols-[14.5rem_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-brand-800 bg-brand-900 px-3 py-5 text-white lg:block">
        <BrandLockup brand={shellBrand} />
        <nav className="mt-7 space-y-1" aria-label="Main navigation">
          {appNavigation.map((item) => (
            <DesktopNavItem key={item.to} item={item} />
          ))}
        </nav>
        <BusinessInfo email={user?.email} brand={shellBrand} />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-brand-800 bg-brand-900 text-white shadow-premium no-print lg:static">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-brand-50 shadow-sm transition hover:bg-white/15 lg:hidden"
                aria-label="Open navigation"
              >
                <Menu aria-hidden="true" className="h-5 w-5" />
              </button>
              <div className="lg:hidden">
                <BrandLockup compact brand={shellBrand} />
              </div>
              <div className="hidden min-w-0 items-center gap-3 text-sm text-brand-100 lg:flex">
                <Menu aria-hidden="true" className="h-4 w-4 flex-none text-accent-500" />
                {hasMultipleShops ? (
                  <select
                    aria-label="Select shop"
                    value={currentShopId ?? ''}
                    onChange={(event) => setCurrentShopId(event.target.value)}
                    className="min-h-10 rounded-lg border border-white/15 bg-brand-800 px-3 text-sm font-medium text-white shadow-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/25"
                  >
                    {memberships.map((membership) => (
                      <option key={membership.shop_id} value={membership.shop_id}>
                        {resolveShopBrand(null, membership.shop).name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="truncate font-medium text-brand-50">{shellBrand.name}</span>
                )}
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="hidden max-w-60 truncate rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-brand-50 sm:block">
                {user?.email ?? 'Signed out'}
              </span>
              {user ? (
                <button
                  type="button"
                  title="Sign out"
                  onClick={() => void signOut()}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-brand-50 shadow-sm transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-accent-500"
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
          <button type="button" className="absolute inset-0 bg-slate-950/55" aria-label="Close navigation" onClick={() => setIsMobileNavOpen(false)} />
          <aside className="relative flex h-full w-[min(19rem,88vw)] flex-col border-r border-brand-800 bg-brand-900 px-4 py-5 text-white shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <BrandLockup brand={shellBrand} />
              <button type="button" onClick={() => setIsMobileNavOpen(false)} title="Close navigation" className="flex h-10 w-10 items-center justify-center rounded-lg text-brand-100 hover:bg-white/10">
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-7 space-y-1" aria-label="Mobile main navigation">
              {appNavigation.map((item) => (
                <DesktopNavItem key={item.to} item={item} onNavigate={() => setIsMobileNavOpen(false)} />
              ))}
            </nav>
            <BusinessInfo email={user?.email} brand={shellBrand} inline />
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function BrandLockup({ brand, compact = false }: { brand: ShopBrand; compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <BrandMark name={brand.name} logoUrl={brand.logo_url} compact={compact} className="bg-brand-800" />
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">{brand.name}</p>
        <p className="truncate text-xs text-brand-100">{appBrand.subtitle}</p>
      </div>
    </div>
  );
}

function BusinessInfo({ email, brand, inline = false }: { email?: string | null; brand: ShopBrand; inline?: boolean }) {
  return (
    <div className={cn('rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-brand-100', inline ? 'mt-auto' : 'absolute inset-x-3 bottom-4')}>
      <p className="truncate font-semibold text-white">{email ?? 'Signed out'}</p>
      <p className="mt-1 truncate">{brand.phone}</p>
      <p className="mt-1 leading-5">{brand.address}</p>
      <p className="mt-1 text-accent-100">{appBrand.timezoneCurrency}</p>
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
          'flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition',
          isActive
            ? 'bg-white text-brand-900 ring-1 ring-accent-500/70'
            : 'text-brand-100 hover:bg-white/10 hover:text-white',
        )
      }
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {item.label}
    </NavLink>
  );
}