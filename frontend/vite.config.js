import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync, existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDir = dirname(fileURLToPath(import.meta.url));
const guideDir = resolve(frontendDir, '../guide');
const guideOutputDir = resolve(frontendDir, 'dist/dhanam-tracker/guide');
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function staticGuide() {
  return {
    name: 'dhanam-static-guide',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = decodeURIComponent((request.url || '').split('?')[0]);
        if (pathname === '/guide' || pathname === '/guide/' || pathname === '/dhanam-tracker/guide') {
          response.statusCode = 302;
          response.setHeader('Location', '/dhanam-tracker/guide/');
          response.end();
          return;
        }
        const prefix = '/dhanam-tracker/guide/';
        if (!pathname.startsWith(prefix)) return next();
        const requested = pathname.slice(prefix.length) || 'index.html';
        const candidate = normalize(resolve(guideDir, requested));
        if (relative(guideDir, candidate).startsWith('..') || !existsSync(candidate) || !statSync(candidate).isFile()) return next();
        response.statusCode = 200;
        response.setHeader('Content-Type', mimeTypes[extname(candidate).toLowerCase()] || 'application/octet-stream');
        response.end(readFileSync(candidate));
      });
    },
    closeBundle() {
      cpSync(guideDir, guideOutputDir, { recursive: true, force: true });
    },
  };
}

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
  plugins: [react(), staticGuide()],
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
