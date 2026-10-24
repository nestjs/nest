import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['e2e/**/*.e2e-spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
