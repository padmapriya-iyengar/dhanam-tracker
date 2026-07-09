import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/dhanam-tracker/',
  build: {
    outDir: 'dist/dhanam-tracker',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/dhanam-tracker/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dhanam-tracker/, ''),
      },
    },
  },
});
