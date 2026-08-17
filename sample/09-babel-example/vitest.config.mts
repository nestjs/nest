import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    testEnvironment: 'node',
    include: ['src/**/*.spec.js'],
  },
});
