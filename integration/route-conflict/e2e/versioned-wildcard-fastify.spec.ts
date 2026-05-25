import { NestApplicationOptions, VersioningType } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { VersionedWildcardModule } from '../src/versioned-wildcard/versioned-wildcard.module.js';

async function buildVersionedFastifyApp(
  options: NestApplicationOptions,
): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [VersionedWildcardModule],
  }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
    options,
  );
  app.enableVersioning({ type: VersioningType.URI });
  return app;
}

// Fastify + URI versioning + named wildcard sharing a prefix with a
// literal route. This is the combination none of the other route-conflict
// integration specs touch end-to-end, and it is the one path where the
// deferred-registration code in `NestApplication.registerRouter` must
// preserve the version filter for a wildcard handler.
describe('Route conflict policy (Fastify, URI versioning + wildcard)', () => {
  let app: NestFastifyApplication | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it('boots with shadow=error because Fastify filters out shadow policy', async () => {
    // The detector reports `/v1/users/me` vs `/v1/users/*path` as a
    // shadow pair, but Fastify's radix tree is order-insensitive so
    // `filteredPolicy` drops the shadow level before `handle` runs.
    app = await buildVersionedFastifyApp({
      routeConflictPolicy: { shadow: 'error' },
    });
    await expect(app.init()).resolves.toBeDefined();
  });

  describe('runtime routing under URI versioning', () => {
    beforeEach(async () => {
      app = await buildVersionedFastifyApp({});
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
    });

    it('routes GET /v1/users/me to the literal handler (UsersMeController)', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/v1/users/me',
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ handler: 'me' });
    });

    it('routes GET /v1/users/anything to the versioned wildcard handler', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/v1/users/anything',
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        handler: 'catchAll',
        tail: 'anything',
      });
    });

    it('routes GET /v1/users/a/b/c to the wildcard (absorbs multi-segment tail)', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/v1/users/a/b/c',
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        handler: 'catchAll',
        tail: 'a/b/c',
      });
    });

    it('returns 404 for GET /v1/users (named wildcard requires at least one segment)', async () => {
      const response = await app!.inject({ method: 'GET', url: '/v1/users' });
      expect(response.statusCode).toBe(404);
    });

    it('routes the unversioned handler outside the /v1 prefix', async () => {
      const response = await app!.inject({
        method: 'GET',
        url: '/users/profile',
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ handler: 'profile' });
    });
  });

  it('still routes correctly through the deferred-registration path when a conflict policy is set', async () => {
    // Setting any policy flips `registerRouter` into the deferred
    // install pass (`registerResolvedRoute`). This asserts the version
    // filter survives that detour for a wildcard handler.
    app = await buildVersionedFastifyApp({
      routeConflictPolicy: { duplicate: 'error' },
    });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const literal = await app.inject({ method: 'GET', url: '/v1/users/me' });
    expect(literal.statusCode).toBe(200);
    expect(literal.json()).toEqual({ handler: 'me' });

    const wildcard = await app.inject({
      method: 'GET',
      url: '/v1/users/anything',
    });
    expect(wildcard.statusCode).toBe(200);
    expect(wildcard.json()).toEqual({ handler: 'catchAll', tail: 'anything' });
  });
});
