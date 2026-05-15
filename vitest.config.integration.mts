import { existsSync } from 'fs';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Resolves `.js` imports to `.ts` source files when both exist side-by-side.
 *
 * The NestJS monorepo keeps compiled `.js` output next to the `.ts` sources.
 * Without this plugin, Vite resolves `import '…/foo.js'` to the compiled JS
 * instead of the original TypeScript source.
 */
function resolveTypescriptSource(): Plugin {
  return {
    name: 'resolve-ts-source',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer) return null;
      const resolved = await this.resolve(source, importer, {
        ...options,
        skipSelf: true,
      });
      if (resolved && !resolved.external && resolved.id.endsWith('.js')) {
        const tsPath = resolved.id.replace(/\.js$/, '.ts');
        if (existsSync(tsPath)) return tsPath;
      }
      return null;
    },
  };
}

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
  plugins: [resolveTypescriptSource()],
});
