import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

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
      include: ['packages/**/*.ts'],
      exclude: [
        '**/*.js',
        '**/*.d.ts',
        '**/*.spec.ts',
        'packages/**/adapters/*.ts',
        'packages/**/nest-*.ts',
        'packages/**/test/**/*.ts',
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
