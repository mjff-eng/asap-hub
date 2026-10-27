import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@asap-hub\/react-components\/src\//,
        replacement: `${path.resolve(
          __dirname,
          '../../packages/react-components/src',
        )}/`,
      },
      {
        find: '@asap-hub/react-components',
        replacement: path.resolve(
          __dirname,
          '../../packages/react-components/src',
        ),
      },
      {
        find: '@asap-hub/demo-timeline',
        replacement: path.resolve(
          __dirname,
          '../../packages/demo-timeline/src',
        ),
      },
    ],
    dedupe: ['react', 'react-dom', 'react-router'],
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'UNRESOLVED_IMPORT') return;
        warn(warning);
      },
    },
  },
  server: {
    open: true,
    port: 3500,
    proxy: {
      '/api': {
        target: 'http://localhost:5555',
        changeOrigin: false,
      },
      // straight to MinIO: the lambda emulation buffers whole responses, so
      // streaming video through the API handler hangs on large files
      '/media': {
        target: 'http://localhost:9010',
        changeOrigin: true,
        rewrite: (proxyPath) => `/demo-hub-local-storage${proxyPath}`,
      },
      // studio source assets, served the same way as the rendered media
      '/projects': {
        target: 'http://localhost:9010',
        changeOrigin: true,
        rewrite: (proxyPath) => `/demo-hub-local-storage${proxyPath}`,
      },
    },
  },
  define: {
    global: 'globalThis',
  },
});
