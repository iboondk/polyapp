// This is the config Vitest uses for `pnpm test`. Vitest reads vitest.config.ts before
// vite.config.ts, so the test settings live here and vite.config.ts only holds the build settings.
// The customElement option matches vite.config.ts, so the tests compile *.ce.vue the same way the
// build does and exercise the real custom element path.
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue({
      customElement: /\.ce\.vue$/,
    }),
  ],
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.ts'],
  },
});
