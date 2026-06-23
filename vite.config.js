import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'pwa-icon.svg'],
      manifest: {
        name: 'Battle Plan — GCSE & A-Level Revision',
        short_name: 'Battle Plan',
        description: 'Track past papers, grades and exam readiness',
        theme_color: '#c27c60',
        background_color: '#0c0e13',
        display: 'standalone',
        icons: [
          { src: 'pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Don't precache the heavy, on-demand libs (KaTeX maths, pdf.js page
        // counting, mammoth .docx) — they'd bloat first load for everyone. They
        // load lazily and are runtime-cached after first use instead.
        globIgnores: ['**/katex-*.js', '**/pdf-*.js', '**/mammoth*.js'],
        navigateFallbackDenylist: [/^\/hq/, /^\/api\//],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // API calls must ALWAYS hit the network — never serve a cached
            // (e.g. stale 401) response for authenticated endpoints.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            // Heavy lazy libs + their fonts: cache on first use, fast after.
            urlPattern: ({ url }) => /\/assets\/(katex|pdf|mammoth)[-.].*\.js$/.test(url.pathname) || /\.(woff2?|ttf)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'heavy-libs', expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 } }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-cache', networkTimeoutSeconds: 10 }
          }
        ]
      }
    })
  ],
  build: {
    minify: 'terser',
    terserOptions: {
      mangle: false,
      compress: { keep_fnames: true, keep_classnames: true },
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        hq:   resolve(__dirname, 'hq.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/scheduler')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'supabase-vendor';
          }
        },
      },
    },
  },
})
