import { NestApplicationOptions } from '@nestjs/common';
import { RouteConflictException } from '@nestjs/core/errors/exceptions/route-conflict.exception.js';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { DuplicateModule } from '../src/duplicate/duplicate.module.js';
import { MultiUserModule } from '../src/multi-user/multi-user.module.js';

interface CapturedLogger {
  warnings: string[];
  logger: {
    log(message: any, ...rest: any[]): void;
    warn(message: any, ...rest: any[]): void;
    error(message: any, ...rest: any[]): void;
    debug(message: any, ...rest: any[]): void;
    verbose(message: any, ...rest: any[]): void;
    fatal(message: any, ...rest: any[]): void;
  };
}

function createCaptureLogger(): CapturedLogger {
  const warnings: string[] = [];
  return {
    warnings,
    logger: {
      log: () => {},
      warn: (message: any) => warnings.push(String(message)),
      error: () => {},
      debug: () => {},
      verbose: () => {},
      fatal: () => {},
    },
  };
}

async function buildFastifyApp(
  moduleClass: any,
  options: NestApplicationOptions,
  capture?: CapturedLogger,
): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [moduleClass],
  }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
    options,
  );
  if (capture) {
    app.useLogger(capture.logger);
  }
  return app;
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
        routeConflictPolicy: { shadow: 'error' },
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
    it('aborts on duplicate=error with the aggregated RouteConflictException', async () => {
      const builtApp = await buildFastifyApp(DuplicateModule, {
        routeConflictPolicy: { duplicate: 'error' },
      });
      await expect(builtApp.init()).rejects.toBeInstanceOf(
        RouteConflictException,
      );
    });

    it('boots on duplicate=warn and emits one warning instead of throwing from Fastify', async () => {
      const capture = createCaptureLogger();
      app = await buildFastifyApp(
        DuplicateModule,
        { routeConflictPolicy: { duplicate: 'warn' } },
        capture,
      );
      await expect(app.init()).resolves.toBeDefined();
      expect(capture.warnings).toHaveLength(1);
      expect(capture.warnings[0]).toContain('/users/me');
    });

    it('boots on duplicate=off silently (later duplicate is dropped, first wins)', async () => {
      const capture = createCaptureLogger();
      app = await buildFastifyApp(
        DuplicateModule,
        { routeConflictPolicy: { duplicate: 'off' } },
        capture,
      );
      await expect(app.init()).resolves.toBeDefined();
      await app.getHttpAdapter().getInstance().ready();

      const response = await app.inject({ method: 'GET', url: '/users/me' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ from: 'A' });
      expect(capture.warnings).toHaveLength(0);
    });
  });
});
