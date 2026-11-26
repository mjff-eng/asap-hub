import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import browserslistToEsbuild from 'browserslist-to-esbuild';

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
    target: browserslistToEsbuild(),
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('/lexical') || id.includes('/@lexical/')) {
            return 'vendor-lexical';
          }
          if (id.includes('/react-select')) {
            return 'vendor-react-select';
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
    port: 4000,
  },
  define: {
    global: 'globalThis',
  },
});
