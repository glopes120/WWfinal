import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/gemini-parse': {
        target: 'http://localhost:3003', // Your Express server's address
      },
    },
  },
});