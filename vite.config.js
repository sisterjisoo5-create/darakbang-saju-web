import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages 프로젝트 경로: https://<user>.github.io/darakbang-saju-web/
  base: '/darakbang-saju-web/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2019',
    sourcemap: false,
  },
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
});
