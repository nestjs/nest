/**
 * Vitest config for coverage collection.
 *
 * Uses esbuild (the default) instead of unplugin-swc so that V8/Istanbul
 * coverage instrumentation works correctly.  unplugin-swc disables esbuild
 * which breaks both coverage providers entirely.
 *
 * Trade-off: esbuild does NOT emit decorator metadata, so tests that rely
 * on `Reflect.getMetadata('design:paramtypes', …)` will fail.  That's
 * acceptable here — we only care about coverage numbers, not test results.
 */
import { existsSync } from 'fs';
import path from 'path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Resolves `.js` imports to `.ts` source files when both exist side-by-side.
 *
 * The NestJS monorepo keeps compiled `.js` output next to the `.ts` sources.
 * Without this plugin, Vite resolves `import '…/foo.js'` to the compiled JS,
 * making coverage track the wrong file (and then excluded by `*.js` patterns).
 */
function resolveTypescriptSource(): Plugin {
  return {
    name: 'resolve-ts-source',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) return null;
      const abs = path.resolve(path.dirname(importer), source);
      if (abs.endsWith('.js')) {
        const tsPath = abs.replace(/\.js$/, '.ts');
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
    include: ['packages/**/*.spec.ts'],
    alias: {
      '@nestjs/common': './packages/common',
      '@nestjs/core': './packages/core',
      '@nestjs/microservices': './packages/microservices',
      '@nestjs/websockets': './packages/websockets',
      '@nestjs/testing': './packages/testing',
      '@nestjs/platform-express': './packages/platform-express',
      '@nestjs/platform-ws': './packages/platform-ws',
      '@nestjs/platform-fastify': './packages/platform-fastify',
      '@nestjs/platform-socket.io': './packages/platform-socket.io',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'clover', 'lcov'],
      reportOnFailure: true,
      include: ['packages/**/*.ts'],
      exclude: [
        '**/node_modules/**',
        '**/*.d.ts',
        '**/*.spec.ts',
        'packages/**/test/**',
        'packages/**/adapters/*.ts',
        'packages/**/nest-*.ts',
        'packages/core/errors/**/*',
        'packages/common/exceptions/*.ts',
        'packages/common/utils/load-package.util.ts',
        'packages/microservices/exceptions/',
        'packages/microservices/microservices-module.ts',
        'packages/core/middleware/middleware-module.ts',
        'packages/core/discovery/discovery-service.ts',
        'packages/core/injector/module-ref.ts',
        'packages/core/injector/instance-links-host.ts',
        'packages/core/helpers/context-id-factory.ts',
        'packages/websockets/socket-module.ts',
        'packages/common/cache/**/*',
        'packages/common/serializer/**/*',
        'packages/common/services/*.ts',
      ],
    },
    setupFiles: ['reflect-metadata'],
    // Allow tests to fail — we only want the coverage data
    passWithNoTests: true,
  },
  plugins: [resolveTypescriptSource()],
});
