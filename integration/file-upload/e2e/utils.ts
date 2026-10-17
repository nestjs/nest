import type { INestApplication, Type } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

export type AdapterName = 'express' | 'fastify' | 'node';

export const PNG = Buffer.from(
  // 1x1 transparent PNG, so FileTypeValidator's magic-number check runs for real
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

export const txt = (filename: string) => ({
  filename,
  contentType: 'text/plain',
});

/**
 * Boots `module` on the given adapter and listens on an ephemeral port on
 * 127.0.0.1 (see `listenOnLoopback()`). On Fastify, `@fastify/multipart` is
 * registered by the adapter; `setup` runs before `app.init()`, `afterInit`
 * between it and `listen()`.
 */
export async function createApp(
  adapterName: AdapterName,
  module: Type<unknown>,
  options: {
    adapter?: FastifyAdapter;
    setup?: (app: NestFastifyApplication) => unknown;
    afterInit?: (app: NestFastifyApplication) => unknown;
  } = {},
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [module],
  }).compile();
  if (adapterName === 'express' || adapterName === 'node') {
    const app = moduleRef.createNestApplication(
      adapterName === 'express' ? new ExpressAdapter() : new NodeAdapter(),
    );
    await listenOnLoopback(app);
    return app;
  }
  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    options.adapter ?? new FastifyAdapter(),
  );
  await options.setup?.(app);
  await app.init();
  await options.afterInit?.(app);
  await listenOnLoopback(app);
  return app;
}
