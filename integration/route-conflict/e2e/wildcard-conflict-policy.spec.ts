import { INestApplication, NestApplicationOptions } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { WildcardModule } from '../src/wildcard/wildcard.module.js';

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
  options: NestApplicationOptions,
  capture: CapturedLogger,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [WildcardModule],
  }).compile();

  const app = moduleRef.createNestApplication(options);
  app.useLogger(capture.logger);
  return app;
}

// WildcardModule resolves to 3 routes declared in this order:
//   GET /files/*path    (wildcard)
//   GET /files/:fileId  (param)
//   GET /files/readme   (literal)
// Every unique pair overlaps, so the detector reports 3 shadow pairs.
const WILDCARD_SHADOW_PAIRS = 3;

describe('Route conflict policy with wildcards (Express, declaration strategy)', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it('with no policy, the wildcard silently swallows every request', async () => {
    const capture = createCaptureLogger();
    app = await buildApp({}, capture);
    await app.init();

    const readme = await request(app.getHttpServer()).get('/files/readme');
    expect(readme.status).toBe(200);
    expect(readme.body).toEqual({ handler: 'catchAll' });

    const byId = await request(app.getHttpServer()).get('/files/42');
    expect(byId.status).toBe(200);
    expect(byId.body).toEqual({ handler: 'catchAll' });

    expect(capture.warnings).toHaveLength(0);
  });

  it('with shadow=warn, emits one warning per overlapping pair', async () => {
    const capture = createCaptureLogger();
    app = await buildApp({ routeConflictPolicy: { shadow: 'warn' } }, capture);
    await app.init();

    expect(capture.warnings).toHaveLength(WILDCARD_SHADOW_PAIRS);
  });

  it('with shadow=warn, the warnings name the wildcard, param and literal routes', async () => {
    const capture = createCaptureLogger();
    app = await buildApp({ routeConflictPolicy: { shadow: 'warn' } }, capture);
    await app.init();

    const joined = capture.warnings.join('\n');
    expect(joined).toContain('/files/*path');
    expect(joined).toContain('/files/:fileId');
    expect(joined).toContain('/files/readme');
  });

  it('with shadow=error, bootstrap is aborted', async () => {
    const capture = createCaptureLogger();
    const builtApp = await buildApp(
      { routeConflictPolicy: { shadow: 'error' } },
      capture,
    );
    await expect(builtApp.init()).rejects.toThrow();
  });

  it('with duplicate=error alone, bootstrap succeeds (no duplicates exist)', async () => {
    const capture = createCaptureLogger();
    app = await buildApp(
      { routeConflictPolicy: { duplicate: 'error' } },
      capture,
    );
    await app.init();
    expect(capture.warnings).toHaveLength(0);
  });
});
