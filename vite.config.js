import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    open: false
  },
  build: {
    chunkSizeWarningLimit: 2000
  }
});
