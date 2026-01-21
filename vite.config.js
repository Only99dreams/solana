// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': process.env, // Pass real env (safe in Vite — only VITE_ vars exposed)
    'process': {
      env: {
        NODE_ENV: '"development"'
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
});