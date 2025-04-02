import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5002,
    strictPort: false, // Permite buscar próxima porta disponível
  },
  preview: {
    port: 5000,
    strictPort: true, // Falha se a porta estiver em uso
  },
});
