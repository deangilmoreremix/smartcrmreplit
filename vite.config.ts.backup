import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: "client",                // tell Vite where index.html is
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
    },
  },
  build: {
    // write to repo-root/dist (what Netlify expects)
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      external: ["@shared/schema"]
    }
  },
});
