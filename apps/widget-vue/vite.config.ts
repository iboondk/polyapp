import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Build settings only. Test settings are in vitest.config.ts, which Vitest reads first.
export default defineConfig({
  plugins: [
    vue({
      // Every *.ce.vue file is compiled as a custom element.
      customElement: /\.ce\.vue$/,
    }),
  ],
  build: {
    lib: {
      entry: 'src/main.ts',
      name: 'PolyAppWidget',
      formats: ['es', 'iife'],
      fileName: (format) => `polyapp-widget.${format}.js`,
    },
  },
});
