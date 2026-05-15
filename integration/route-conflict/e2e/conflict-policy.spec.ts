import {
  INestApplication,
  NestApplicationOptions,
  RouteConflictPolicyLevel,
} from '@nestjs/common';
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

async function buildApp(
  moduleClass: any,
  options: NestApplicationOptions,
  capture: CapturedLogger,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [moduleClass],
  }).compile();

  const app = moduleRef.createNestApplication(options);
  app.useLogger(capture.logger);
  return app;
}

interface MultiUserCase {
  description: string;
  duplicate?: RouteConflictPolicyLevel;
  shadow?: RouteConflictPolicyLevel;
  expectsBoot: boolean;
  expectedWarnings: number;
}

// MultiUserModule resolves to 4 routes; on the order-sensitive Express
// adapter, `GET /users/:userId` is registered first and shadows two
// later routes: `GET /users/me` and `GET /users/images`. There are no
// duplicates in this fixture, so duplicate-axis policies never fire.
const SHADOW_PAIRS_IN_MULTI_USER = 2;

const MULTI_USER_CASES: MultiUserCase[] = [
  {
    description: 'unset policy leaves the silent shadow in place',
    expectsBoot: true,
    expectedWarnings: 0,
  },
  {
    description: 'duplicate=off, shadow=off is silent',
    duplicate: 'off',
    shadow: 'off',
    expectsBoot: true,
    expectedWarnings: 0,
  },
  {
    description: 'duplicate=off, shadow=warn logs one warning per shadow pair',
    duplicate: 'off',
    shadow: 'warn',
    expectsBoot: true,
    expectedWarnings: SHADOW_PAIRS_IN_MULTI_USER,
  },
  {
    description: 'duplicate=off, shadow=error aborts bootstrap',
    duplicate: 'off',
    shadow: 'error',
    expectsBoot: false,
    expectedWarnings: 0,
  },
  {
    description: 'duplicate=warn, shadow=off has nothing to warn about',
    duplicate: 'warn',
    shadow: 'off',
    expectsBoot: true,
    expectedWarnings: 0,
  },
  {
    description: 'duplicate=warn, shadow=warn warns only on shadow pairs',
    duplicate: 'warn',
    shadow: 'warn',
    expectsBoot: true,
    expectedWarnings: SHADOW_PAIRS_IN_MULTI_USER,
  },
  {
    description:
      'duplicate=error, shadow=off boots because no duplicates exist',
    duplicate: 'error',
    shadow: 'off',
    expectsBoot: true,
    expectedWarnings: 0,
  },
  {
    description: 'duplicate=error, shadow=warn boots and warns on shadows only',
    duplicate: 'error',
    shadow: 'warn',
    expectsBoot: true,
    expectedWarnings: SHADOW_PAIRS_IN_MULTI_USER,
  },
  {
    description: 'duplicate=error, shadow=error aborts bootstrap',
    duplicate: 'error',
    shadow: 'error',
    expectsBoot: false,
    expectedWarnings: 0,
  },
];

describe('Route conflict policy (Express, declaration strategy)', () => {
  describe('multi-user fixture (cross-controller shadow)', () => {
    let app: INestApplication | undefined;

    afterEach(async () => {
      if (app) {
        await app.close();
        app = undefined;
      }
    });

    MULTI_USER_CASES.forEach(testCase => {
      it(testCase.description, async () => {
        const conflictPolicy =
          testCase.duplicate === undefined && testCase.shadow === undefined
            ? undefined
            : { duplicate: testCase.duplicate, shadow: testCase.shadow };

        const capture = createCaptureLogger();
        const builtApp = await buildApp(
          MultiUserModule,
          { routerConflictPolicy: conflictPolicy },
          capture,
        );

        if (testCase.expectsBoot) {
          await builtApp.init();
          app = builtApp;
          expect(capture.warnings).toHaveLength(testCase.expectedWarnings);
        } else {
          await expect(builtApp.init()).rejects.toThrow();
        }
      });
    });

    it('with no policy, `/users/me` is silently routed to `:userId`', async () => {
      const capture = createCaptureLogger();
      app = await buildApp(MultiUserModule, {}, capture);
      await app.init();

      const meResponse = await request(app.getHttpServer()).get('/users/me');
      expect(meResponse.status).toBe(200);
      expect(meResponse.body).toEqual({ handler: 'byId', userId: 'me' });

      const imagesResponse = await request(app.getHttpServer()).get(
        '/users/images',
      );
      expect(imagesResponse.status).toBe(200);
      expect(imagesResponse.body).toEqual({
        handler: 'byId',
        userId: 'images',
      });
    });

    it('with shadow=warn, the warning message names both endpoints', async () => {
      const capture = createCaptureLogger();
      app = await buildApp(
        MultiUserModule,
        { routerConflictPolicy: { shadow: 'warn' } },
        capture,
      );
      await app.init();

      const joined = capture.warnings.join('\n');
      expect(joined).toContain('/users/me');
      expect(joined).toContain('/users/images');
      expect(joined).toContain('/users/:userId');
    });
  });

  describe('duplicate fixture', () => {
    let app: INestApplication | undefined;

    afterEach(async () => {
      if (app) {
        await app.close();
        app = undefined;
      }
    });

    it('with duplicate=off, both controllers boot and the first one wins', async () => {
      const capture = createCaptureLogger();
      app = await buildApp(
        DuplicateModule,
        { routerConflictPolicy: { duplicate: 'off' } },
        capture,
      );
      await app.init();

      const response = await request(app.getHttpServer()).get('/users/me');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ from: 'A' });
      expect(capture.warnings).toHaveLength(0);
    });

    it('with duplicate=warn, a single warning is emitted', async () => {
      const capture = createCaptureLogger();
      app = await buildApp(
        DuplicateModule,
        { routerConflictPolicy: { duplicate: 'warn' } },
        capture,
      );
      await app.init();

      expect(capture.warnings).toHaveLength(1);
      expect(capture.warnings[0]).toContain('/users/me');
    });

    it('with duplicate=error, bootstrap is aborted', async () => {
      const capture = createCaptureLogger();
      const builtApp = await buildApp(
        DuplicateModule,
        { routerConflictPolicy: { duplicate: 'error' } },
        capture,
      );
      await expect(builtApp.init()).rejects.toThrow();
    });

    it('with only shadow=error, the duplicate-only fixture still boots', async () => {
      const capture = createCaptureLogger();
      app = await buildApp(
        DuplicateModule,
        { routerConflictPolicy: { shadow: 'error' } },
        capture,
      );
      await app.init();
      expect(capture.warnings).toHaveLength(0);
    });
  });
});
