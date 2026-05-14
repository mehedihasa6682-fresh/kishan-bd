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
        strategies: 'generateSW',
        includeAssets: ['favicon.ico', 'placeholder.png', 'logo.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'সদাই ভাই - অনলাইন গ্রোছারি শপ',
          short_name: 'সদাই ভাই',
          description: 'Premium grocery and supermarket shopping experience. Fresh organic products delivered to your door.',
          id: 'com.sodaibhai.pwa.v1',
          start_url: '.',
          scope: '/',
          display: 'standalone',
          display_override: ['standalone', 'window-controls-overlay', 'minimal-ui'],
          background_color: '#050E21',
          theme_color: '#050E21',
          orientation: 'portrait',
          categories: ['shopping', 'food', 'lifestyle'],
          lang: 'bn-BD',
          dir: 'ltr',
          prefer_related_applications: false,
          icons: [
            {
              src: '/logo.png',
              sizes: '144x144',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/logo.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/logo.png',
              sizes: '384x384',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/logo.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/logo.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          shortcuts: [
            {
              name: 'সব পণ্য',
              short_name: 'পণ্য',
              description: 'সকল গ্রোছারি পণ্য দেখুন',
              url: '/products',
              icons: [{ src: '/logo.png', sizes: '192x192' }]
            },
            {
              name: 'আমার অর্ডার',
              short_name: 'অর্ডার',
              description: 'আপনার অর্ডারের অবস্থা দেখুন',
              url: '/orders',
              icons: [{ src: '/logo.png', sizes: '192x192' }]
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
          importScripts: ['/firebase-messaging-sw.js'],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'unsplash-images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'images',
                expiration: {
                  maxEntries: 100,
                },
              },
            },
            {
              urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'firestore-data',
                networkTimeoutSeconds: 5,
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
