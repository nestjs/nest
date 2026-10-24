import type {
  INestApplication,
  NestApplicationOptions,
  Type,
} from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

export type AdapterName = 'express' | 'fastify' | 'node';

const factories = {
  express: () => new ExpressAdapter(),
  fastify: () => new FastifyAdapter(),
  node: () => new NodeAdapter(),
};

/**
 * `[name]` tuples for `describe.each()`, for the adapters a behavior must be
 * the same on.
 */
export function adapters(...names: AdapterName[]): [AdapterName][] {
  return names.map(name => [name]);
}

/**
 * Creates an application for `module` on the given adapter, lets `setup`
 * configure it, and listens on 127.0.0.1.
 */
export async function createApp(
  name: AdapterName,
  module: Type<unknown>,
  setup?: (app: INestApplication) => unknown,
  options: NestApplicationOptions = {},
  adapter = factories[name](),
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [module],
  }).compile();
  const app = moduleRef.createNestApplication(adapter, {
    logger: false,
    ...options,
  });
  await setup?.(app);
  await listenOnLoopback(app);
  if (adapter instanceof FastifyAdapter) {
    await adapter.getInstance().ready();
  }
  return app;
}

/**
 * Sets `X-Middleware: ran`, to tell which requests a middleware saw.
 */
export function markMiddleware(_req: unknown, res: any, next: () => void) {
  (res.raw ?? res).setHeader('X-Middleware', 'ran');
  next();
}
