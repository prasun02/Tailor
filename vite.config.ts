import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function patchViteDevClientBundledFlag(): Plugin {
  return {
    name: 'tailor-store-patch-vite-dev-client-bundled-flag',
    apply: 'serve',
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, '/');
      const isViteDevClient = normalizedId.endsWith('/vite/dist/client/client.mjs') || normalizedId === '/@vite/client';

      if (!isViteDevClient || !code.includes('__BUNDLED_DEV__')) {
        return null;
      }

      return {
        code: code.split('__BUNDLED_DEV__').join('false'),
        map: null,
      };
    },
  };
}

export default defineConfig(({ command }) => ({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
              priority: 30,
            },
            {
              name: 'supabase-vendor',
              test: /node_modules[\\/]@supabase[\\/]/,
              priority: 25,
            },
            {
              name: 'query-vendor',
              test: /node_modules[\\/]@tanstack[\\/]/,
              priority: 20,
            },
            {
              name: 'form-vendor',
              test: /node_modules[\\/](react-hook-form|@hookform)[\\/]/,
              priority: 15,
            },
            {
              name: 'validation-vendor',
              test: /node_modules[\\/]zod[\\/]/,
              priority: 15,
            },
            {
              name: 'ui-vendor',
              test: /node_modules[\\/](lucide-react|date-fns|clsx|tailwind-merge)[\\/]/,
              priority: 10,
            },
            {
              name: 'vendor',
              test: /node_modules[\\/]/,
              priority: 1,
              maxSize: 250 * 1024,
            },
          ],
        },
      },
    },
  },
  plugins: [
    patchViteDevClientBundledFlag(),
    react(),
    tailwindcss(),
    VitePWA({
      disable: command !== 'build',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon.svg'],
      manifest: {
        name: 'Tailor Store Manager',
        short_name: 'Tailor',
        description: 'Mobile-first tailor shop management',
        theme_color: '#0f766e',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
}));
