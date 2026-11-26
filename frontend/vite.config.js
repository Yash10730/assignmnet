import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development, /api is proxied to the backend so no CORS setup is needed
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
