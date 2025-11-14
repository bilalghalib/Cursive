import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'static',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  },

  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5022',
        changeOrigin: true
      },
      '/pages': {
        target: 'http://localhost:5022',
        changeOrigin: true
      }
    }
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './static/js'),
      '@types': path.resolve(__dirname, './static/types')
    }
  }
});
