import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  css: { postcss: { plugins: [] } },
  build: { rollupOptions: { output: { manualChunks: { three: ['three'], serif: ['three/examples/fonts/optimer_bold.typeface.json'] } } } }
});
