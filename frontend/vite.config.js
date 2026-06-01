import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    open: true,
    host: '127.0.0.1',
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.venv/**',
        '**/__pycache__/**',
        '**/dist/**',
        '**/build/**',
        '**/uploads/**',
        '**/mongodb_data/**',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        ws: true,
      },
      '/send-otp': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/verify-otp': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['@vite/client', '@vite/env'],
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
