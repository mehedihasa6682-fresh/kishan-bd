import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'script',
        includeAssets: ['favicon.ico', 'placeholder.png'],
        manifest: {
          name: 'সদাই ভাই - অনলাইন গ্রোছারি শপ',
          short_name: 'সদাই ভাই',
          description: 'Premium grocery and supermarket shopping experience. Fresh organic products delivered to your door.',
          id: 'sodaibhai-pwa-v1',
          start_url: '/',
          scope: '/',
          theme_color: '#050E21',
          background_color: '#050E21',
          display: 'standalone',
          display_override: ['standalone', 'window-controls-overlay'],
          orientation: 'portrait',
          categories: ['shopping', 'food'],
          lang: 'bn-BD',
          dir: 'ltr',
          icons: [
            {
              src: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          screenshots: [
            {
              src: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=1080&h=1920&fit=crop',
              sizes: '1080x1920',
              type: 'image/jpeg',
              form_factor: 'narrow',
              label: 'সদাই ভাই Mobile App'
            },
            {
              src: 'https://images.unsplash.com/photo-1464226110844-0c7746465494?w=1920&h=1080&fit=crop',
              sizes: '1920x1080',
              type: 'image/jpeg',
              form_factor: 'wide',
              label: 'সদাই ভাই Dashboard'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          navigateFallback: 'index.html',
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'unsplash-images',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'firestore-data',
              },
            },
          ],
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
