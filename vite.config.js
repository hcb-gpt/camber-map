import { defineConfig } from 'vite';

export default defineConfig({
  // Don't remap public/ to root — tests expect /public/diagram.nodes.json etc.
  publicDir: false,
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
  test: {
    include: ['src/__tests__/**/*.test.js'],
  },
});
