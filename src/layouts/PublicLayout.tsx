import { Outlet } from 'react-router-dom';
import { appBrand } from '../app/brand';
import { BrandMark } from '../components/BrandMark';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-brand-50 text-slate-950">
      <header className="border-b border-brand-800 bg-brand-900 text-white shadow-premium">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <BrandMark name={appBrand.name} logoUrl={appBrand.logoUrl} compact className="bg-brand-800" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{appBrand.name}</p>
            <p className="truncate text-sm text-brand-100">{appBrand.subtitle}</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}