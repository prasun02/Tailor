import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { AppProviders } from './app/providers';
import { RootErrorBoundary } from './components/RootErrorBoundary';
import './styles/index.css';

function removeDevelopmentServiceWorkers() {
  if (!import.meta.env.DEV || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .getRegistrations()
      .then(async (registrations) => {
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ('caches' in window) {
          const cacheNames = await window.caches.keys();
          await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
        }
      })
      .catch((error: unknown) => {
        console.warn('Could not clear development service worker cache.', error);
      });
  });
}

const rootElement = document.getElementById('root');

if (rootElement) {
  removeDevelopmentServiceWorkers();

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <AppProviders>
          <App />
        </AppProviders>
      </RootErrorBoundary>
    </React.StrictMode>,
  );
} else {
  const fallback = document.createElement('main');
  fallback.className = 'min-h-screen bg-slate-50 px-4 py-8 text-slate-950';
  fallback.textContent = 'Application root element was not found.';
  document.body.append(fallback);
}
