import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'static',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    },
    // Copy public assets
    copyPublicDir: true
  },
  
  server: {
    host: '0.0.0.0', // Expose to local network for iPad testing
    port: 5173,
    open: true,
    // Serve static directory
    fs: {
      allow: ['..']
    }
  },
  
  // Environment variable prefix
  envPrefix: 'VITE_',
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './static/js')
    }
  }
});
