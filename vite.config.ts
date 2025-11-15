import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // Serve from project root
  root: '.',

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
    // No proxy needed - we're calling Supabase Edge Functions directly
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './static/js'),
      '@types': path.resolve(__dirname, './static/types')
    }
  }
});
