import type { INestApplication, Type } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';

export type AdapterName = 'express' | 'fastify';

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
 * 127.0.0.1. On Fastify, `@fastify/multipart` is registered by the adapter;
 * `setup` runs before `app.init()`, `afterInit` between it and `listen()`.
 *
 * Listening explicitly matters: given a server that is not listening,
 * supertest listens on port 0 of every interface (`::`), and on some
 * systems another process can then hold the same port on 127.0.0.1, which
 * is where supertest sends the request.
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
  if (adapterName === 'express') {
    const app = moduleRef.createNestApplication(new ExpressAdapter());
    await app.listen(0, '127.0.0.1');
    return app;
  }
  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    options.adapter ?? new FastifyAdapter(),
  );
  await options.setup?.(app);
  await app.init();
  await options.afterInit?.(app);
  await app.listen(0, '127.0.0.1');
  return app;
}
