import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },

  plugins: [react()],

  // There is deliberately no `define` for GEMINI_API_KEY here. The previous
  // config substituted it into any client file that read process.env, which
  // only stayed harmless because services/magnificEngine.ts happens to be
  // imported by the server alone -- one stray client import of that module
  // and the key would have been baked into the public bundle with no warning.
  // Server-side secrets are read from process.env at runtime, in server.ts
  // and the Vercel function; the browser reaches Magnific through
  // /api/magnific/generate and never sees a key.

  esbuild: {
    // Strip developer logging from production bundles. console.warn and
    // console.error survive on purpose: those are the ones that make a user's
    // bug report actionable, and the ErrorBoundary writes to console.error.
    // Keyed off the Vite command rather than NODE_ENV: a build host that
    // does not happen to export NODE_ENV=production would otherwise ship the
    // logging anyway, silently.
    pure: command === 'build' ? ['console.log', 'console.debug', 'console.info'] : [],
  },

  build: {
    rollupOptions: {
      output: {
        // Split the dependencies that change on a different clock from the app
        // code, so a routine deploy does not invalidate the browser's cache of
        // React and friends. Everything only reachable from the import/export
        // buttons (xlsx, jspdf, jszip) is already behind a dynamic import in
        // App.tsx and lands in its own chunk automatically.
        manualChunks: {
          react: ['react', 'react-dom'],
          motion: ['motion'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
    // The entry chunk is comfortably under this now; the warning exists to
    // catch a regression, so it is tightened rather than silenced.
    chunkSizeWarningLimit: 700,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
}));
