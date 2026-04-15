import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiPort = env.VITE_DEV_API_PORT || '8000';
  const apiOrigin = `http://127.0.0.1:${apiPort}`;
  const prod = mode === 'production';

  return {
    plugins: [react()],
    esbuild: {
      drop: prod ? (['console', 'debugger'] as const) : [],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tensorflow/tfjs',
        '@tensorflow/tfjs-backend-wasm',
        '@tensorflow-models/coco-ssd',
        '@tensorflow-models/mobilenet',
      ],
    },
    build: {
      target: 'es2020',
      reportCompressedSize: false,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react';
            if (id.includes('node_modules/react-router-dom')) return 'vendor-router';
            if (
              id.includes('node_modules/@tensorflow') ||
              id.includes('node_modules/@tensorflow-models')
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
      watch: {
        ignored: [
          '**/android/**',
          '**/ios/**',
          '**/src-tauri/target/**',
          '**/._*',
        ],
      },
      proxy: {
        '/api': {
          target: apiOrigin,
          changeOrigin: true,
          timeout: 120_000,
          proxyTimeout: 120_000,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              const msg = err instanceof Error ? err.message : String(err);
              console.error(
                `\n[vite proxy /api] Нет ответа от ${apiOrigin} —`,
                msg,
                `\n→ Запусти API: cd backend && docker compose up -d db redis api`,
                `\n→ Проверка: curl -s ${apiOrigin}/health/ready`,
                `\n→ Порт задаётся в frontend/.env: VITE_DEV_API_PORT (сейчас ${apiPort})\n`
              );
            });
          },
        },
        '/static': {
          target: apiOrigin,
          changeOrigin: true,
        },
        '/health': {
          target: apiOrigin,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: true,
      port: 5173,
    },
  };
});
