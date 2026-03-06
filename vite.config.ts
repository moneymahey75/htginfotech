import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['lucide-react', 'ioredis', 'redis'],
  },
  resolve: {
    alias: {
      // Prevent Redis from being bundled in browser
      ioredis: false,
      redis: false,
    },
  },
  build: {
    rollupOptions: {
      external: ['ioredis', 'redis']
    }
  }
});
