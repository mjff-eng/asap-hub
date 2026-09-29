import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Components & UI
      '@asap-hub/react-components': path.resolve(
        __dirname,
        '../../packages/react-components/src',
      ),
      '@asap-hub/react-components/manuscript-form': path.resolve(
        __dirname,
        '../../packages/react-components/src/manuscript-form.ts',
      ),

      // Context & State
      '@asap-hub/react-context/src': path.resolve(
        __dirname,
        '../../packages/react-context/src',
      ),
      '@asap-hub/react-context': path.resolve(
        __dirname,
        '../../packages/react-context/src',
      ),

      // Utilities & Logic
      '@asap-hub/frontend-utils': path.resolve(
        __dirname,
        '../../packages/frontend-utils/src',
      ),
      '@asap-hub/validation': path.resolve(
        __dirname,
        '../../packages/validation/src',
      ),
      '@asap-hub/routing': path.resolve(
        __dirname,
        '../../packages/routing/src',
      ),
      '@asap-hub/flags': path.resolve(__dirname, '../../packages/flags/src'),

      // Data & Models
      '@asap-hub/model': path.resolve(__dirname, '../../packages/model/src'),

      // Auth & Search
      '@asap-hub/auth': path.resolve(__dirname, '../../packages/auth/src'),
      '@asap-hub/algolia': path.resolve(
        __dirname,
        '../../packages/algolia/src',
      ),
    },
    // Ensure peer dependencies are resolved from the app's node_modules
    dedupe: ['react', 'react-dom', 'react-router'],
  },
  build: {
    sourcemap: true,
    target: browserslistToEsbuild(),
    rollupOptions: {
      // Don't warn about peer dependencies
      onwarn(warning, warn) {
        // Ignore "unresolved dependencies" warnings for external packages
        if (warning.code === 'UNRESOLVED_IMPORT') return;
        warn(warning);
      },
      output: {
        manualChunks(id: string) {
          if (id.includes('/lexical') || id.includes('/@lexical/')) {
            return 'vendor-lexical';
          }
          if (id.includes('/react-select')) {
            return 'vendor-react-select';
          }
          if (id.includes('/xlsx')) {
            return 'vendor-xlsx';
          }
          if (id.includes('/csv-stringify')) {
            return 'vendor-csv';
          }
        },
      },
    },
  },
  server: {
    open: true,
    port: 3000,
  },
  define: {
    global: 'globalThis',
  },
});
