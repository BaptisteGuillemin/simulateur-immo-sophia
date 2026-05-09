import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
              return 'vendor-react';
            }
            if (
              id.includes('/recharts/') ||
              id.includes('/d3-') ||
              id.includes('/victory-vendor/') ||
              id.includes('/internmap/')
            ) {
              return 'vendor-recharts';
            }
          }
          if (id.includes('/src/components/charts/')) {
            return 'vendor-charts';
          }
        },
      },
    },
  },
});
