import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['integration/**/*.spec.ts'],
    exclude: [
      '**/node_modules/**',
      // Excluded until third-party @nestjs/* packages support ESM.
      // CJS require() of workspace packages causes a dual-package hazard
      // (different class instances for ModuleRef, etc.).
      'integration/mongoose/**',
      'integration/typeorm/**',
      'integration/graphql-code-first/**',
      'integration/graphql-schema-first/**',
      // TODO: remove once these are ESM-compatible
      // Uses @nestjs/mapped-types (CJS) — same dual-package hazard
      'integration/inspector/**',
      'integration/repl/e2e/repl.spec.ts',
    ],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ['reflect-metadata'],
    reporters: ['default'],
    fileParallelism: false,
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2023',
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
        keepClassNames: true,
      },
    }),
  ],
});
