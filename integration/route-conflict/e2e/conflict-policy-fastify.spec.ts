import { NestApplicationOptions } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { DuplicateModule } from '../src/duplicate/duplicate.module.js';
import { MultiUserModule } from '../src/multi-user/multi-user.module.js';

async function buildFastifyApp(
  moduleClass: any,
  options: NestApplicationOptions,
): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [moduleClass],
  }).compile();
  return moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
    options,
  );
}

describe('Route conflict policy (Fastify)', () => {
  let app: NestFastifyApplication | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  describe('multi-user fixture', () => {
    it('boots even with shadow=error because Fastify is not order-sensitive', async () => {
      app = await buildFastifyApp(MultiUserModule, {
        routerConflictPolicy: { shadow: 'error' },
      });
      await expect(app.init()).resolves.toBeDefined();
    });

    it('natively routes every endpoint correctly without any strategy', async () => {
      app = await buildFastifyApp(MultiUserModule, {});
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
      const fastifyApp = app;

      const cases: Array<{ url: string; body: Record<string, unknown> }> = [
        { url: '/users/me', body: { handler: 'me' } },
        { url: '/users/images', body: { handler: 'images' } },
        {
          url: '/users/images/42',
          body: { handler: 'imageById', imageId: '42' },
        },
        { url: '/users/abc', body: { handler: 'byId', userId: 'abc' } },
      ];

      for (const testCase of cases) {
        const response = await fastifyApp.inject({
          method: 'GET',
          url: testCase.url,
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual(testCase.body);
      }
    });
  });

  describe('duplicate fixture', () => {
    it('still throws on duplicate=error (duplicates are universal)', async () => {
      const builtApp = await buildFastifyApp(DuplicateModule, {
        routerConflictPolicy: { duplicate: 'error' },
      });
      await expect(builtApp.init()).rejects.toThrow();
    });
  });
});
