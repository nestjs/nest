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
    setupFiles: ['reflect-metadata'],
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2022',
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
