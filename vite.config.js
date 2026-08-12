import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // environment: 'node' (the default) is enough - every test target here is
  // pure logic (no DOM), so there's no jsdom/happy-dom dependency to add.
  test: {
    include: ['src/**/*.test.js'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('src/data/categories/')) {
            return 'questions-data';
          }
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/canvas-confetti')) {
            return 'vendor-ui';
          }
        }
      }
    }
  }
});