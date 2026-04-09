import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('node_modules/react-router-dom')) return 'vendor-router';
          if (
            id.includes('node_modules/@tensorflow') ||
            id.includes('node_modules/@teachablemachine')
          ) {
            return 'vendor-ml';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // Не следить за копиями Capacitor (cap sync) и артефактами Tauri — иначе лишние HMR/reload и шум от ._*
    watch: {
      ignored: [
        '**/android/**',
        '**/ios/**',
        '**/src-tauri/target/**',
        '**/._*',
      ],
    },
    proxy: {
      // Dev: фронт бьёт в тот же origin → /api → 127.0.0.1 (обходит CORS и проблемы localhost/IPv6)
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 5173,
  },
});
