import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// simulate __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },


  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001', 
        changeOrigin: true,
      },
    },
  },
});