import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Dev-only: serve the Netlify AI function (netlify/functions/ai.ts) at /api/ai/*
 * so AI tools work with plain `npm run dev`. In production Netlify routes
 * /api/ai/* to the deployed function (see netlify.toml).
 */
function aiGatewayDevPlugin(): Plugin {
  return {
    name: 'ai-gateway-dev',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/ai', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/netlify/functions/ai.ts');
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) {
            if (typeof v === 'string') headers.set(k, v);
          }
          const request = new Request(`http://localhost/api/ai${req.url || ''}`, {
            method: req.method,
            headers,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
          });
          const response: Response = await mod.default(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          // Stream the body through (image generation sends partial previews as server-sent events).
          if (response.body) {
            const reader = response.body.getReader();
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(Buffer.from(value));
            }
          }
          res.end();
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e?.message || 'AI dev gateway failed' }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Expose server-only secrets from .env (OPENAI_API_KEY, GEMINI_API_KEY, ...) to the dev gateway.
  const serverEnv = loadEnv(mode, process.cwd(), '');
  for (const [k, v] of Object.entries(serverEnv)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }

  return {
  plugins: [
    react(),
    aiGatewayDevPlugin(),
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
        navigateFallbackDenylist: [/^\/api\//],
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
          if (id.includes('node_modules/lucide-react') ||
              id.includes('node_modules/@hello-pangea/dnd') ||
              id.includes('node_modules/react-select')) {
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
};
});
