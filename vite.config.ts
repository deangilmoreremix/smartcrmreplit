import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.gemini\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'gemini-api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 30 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: 'SmartCRM Dashboard',
        short_name: 'SmartCRM',
        description: 'Advanced AI-powered Customer Relationship Management system',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  optimizeDeps: {
    // Removed lucide-react exclusion to fix forwardRef bundling issues
  },
  define: {
    global: 'globalThis', // <- changed from 'window'
  },
  resolve: {
    alias: {
      events: 'events',
      util: 'util',
      stream: 'stream-browserify',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/@headlessui')) {
            return 'ui-vendor';
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/react-big-calendar')) {
            return 'chart-vendor';
          }

          // AI Tools
          if (id.includes('src/components/aiTools/')) {
            return 'ai-tools';
          }

          // Services
          if (id.includes('src/services/')) {
            return 'services';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
