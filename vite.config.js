import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    open: false
  },
  build: {
    target: 'es2018',
    chunkSizeWarningLimit: 2000
  }
});
