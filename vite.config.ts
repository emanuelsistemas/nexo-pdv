import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react', 'react-dom', 'react-router-dom']
  },
  build: {
    outDir: 'dist',
    minify: 'terser',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  server: {
    port: 5002,
    strictPort: false, // Permite buscar próxima porta disponível
    open: true, // Abre navegador automaticamente
    hmr: {
      overlay: true, // Mostrar erros na tela
    },
  },
  preview: {
    port: 5000,
    strictPort: false, // Permite buscar próxima porta disponível
  },
  // Cache control
  cacheDir: 'node_modules/.vite'
});
