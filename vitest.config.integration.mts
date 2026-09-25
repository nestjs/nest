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
  // Spec files are excluded from every tsconfig in the repo, so Oxc cannot pick
  // up `experimentalDecorators`/`emitDecoratorMetadata` from them and would emit
  // TC39 decorators (which reject parameter decorators). Configure them here.
  oxc: {
    decorator: {
      legacy: true,
      emitDecoratorMetadata: true,
    },
    assumptions: {
      setPublicClassFields: true,
    },
    typescript: {
      removeClassFieldsWithoutInitializer: true,
    },
  },
  test: {
    globals: true,
    root: './',
    include: ['integration/**/*.spec.ts'],
    exclude: [
      '**/node_modules/**',
      // Two copies of `graphql` load: "Cannot use GraphQLSchema from another
      // module or realm".
      'integration/graphql-code-first/**',
      // The serialized graph gains websocket entrypoints the fixture lacks.
      'integration/inspector/**',
      // `@nestjs/core/repl/native-functions` does not resolve under `exports`.
      'integration/repl/e2e/repl.spec.ts',
    ],
    server: {
      deps: {
        // Transform the @nestjs/* packages that live in node_modules so their
        // `@nestjs/core` imports reach the same TypeScript sources as the
        // tests; loaded natively they get the compiled `.js`, a second copy
        // of every class (ModuleRef, HttpAdapterHost).
        inline: [/@nestjs\/(apollo|graphql|mongoose|typeorm)/],
      },
    },
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ['reflect-metadata'],
    reporters: ['default'],
    fileParallelism: false,
  },
  plugins: [resolveTypescriptSource()],
});
