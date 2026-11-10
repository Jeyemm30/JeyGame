import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    open: false,
    watch: {
      ignored: ['**/.edge*/**', '**/dist/**']
    }
  },
  build: {
    target: 'es2018',
    assetsInlineLimit: 65536
  }
});
