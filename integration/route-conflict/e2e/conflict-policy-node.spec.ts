import { NestApplicationOptions } from '@nestjs/common';
import { RouteConflictException } from '@nestjs/core/errors/exceptions/route-conflict.exception.js';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import request from 'supertest';
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

async function buildNodeApp(
  moduleClass: any,
  options: NestApplicationOptions,
  capture?: CapturedLogger,
): Promise<NestNodeApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [moduleClass],
  }).compile();
  const app = moduleRef.createNestApplication<NestNodeApplication>(
    new NodeAdapter(),
    options,
  );
  if (capture) {
    app.useLogger(capture.logger);
  }
  return app;
}

describe('Route conflict policy (Node)', () => {
  let app: NestNodeApplication | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  describe('multi-user fixture', () => {
    it('boots even with shadow=error because the Node adapter is not order-sensitive', async () => {
      app = await buildNodeApp(MultiUserModule, {
        routeConflictPolicy: { shadow: 'error' },
      });
      await expect(app.init()).resolves.toBeDefined();
    });

    it('natively routes every endpoint correctly without any strategy', async () => {
      app = await buildNodeApp(MultiUserModule, {});
      await app.init();

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
        await request(app.getHttpServer())
          .get(testCase.url)
          .expect(200, testCase.body);
      }
    });
  });

  describe('duplicate fixture', () => {
    it('aborts on duplicate=error with the aggregated RouteConflictException', async () => {
      const builtApp = await buildNodeApp(DuplicateModule, {
        routeConflictPolicy: { duplicate: 'error' },
      });
      await expect(builtApp.init()).rejects.toBeInstanceOf(
        RouteConflictException,
      );
    });

    it('boots on duplicate=warn and emits one warning', async () => {
      const capture = createCaptureLogger();
      app = await buildNodeApp(
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
      app = await buildNodeApp(
        DuplicateModule,
        { routeConflictPolicy: { duplicate: 'off' } },
        capture,
      );
      await expect(app.init()).resolves.toBeDefined();

      await request(app.getHttpServer())
        .get('/users/me')
        .expect(200, { from: 'A' });
      expect(capture.warnings).toHaveLength(0);
    });

    it('boots without a policy, and the first duplicate wins (Fastify throws at registration)', async () => {
      app = await buildNodeApp(DuplicateModule, {});
      await expect(app.init()).resolves.toBeDefined();

      await request(app.getHttpServer())
        .get('/users/me')
        .expect(200, { from: 'A' });
    });
  });
});
