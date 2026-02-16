import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['e2e/**/*.e2e-spec.ts'],
  },
  plugins: [swc.vite()],
});
