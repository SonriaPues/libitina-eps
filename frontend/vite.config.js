import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, las peticiones a /api se envían al API Gateway (Docker Compose)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
});
