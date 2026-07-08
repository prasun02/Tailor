import { Outlet } from 'react-router-dom';
import { appEnv } from '../lib/env';
import { appLogoIcon as LogoIcon } from '../routes/navigation';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-600 text-white">
            <LogoIcon aria-hidden="true" className="h-6 w-6" />
          </span>
          <div>
            <p className="text-base font-semibold">{appEnv.appName}</p>
            <p className="text-sm text-slate-500">Secure tailor shop workspace</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}