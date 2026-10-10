import { NestApplicationOptions, VersioningType } from '@nestjs/common';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { VersionedWildcardModule } from '../src/versioned-wildcard/versioned-wildcard.module.js';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

async function buildVersionedNodeApp(
  options: NestApplicationOptions,
): Promise<NestNodeApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [VersionedWildcardModule],
  }).compile();
  const app = moduleRef.createNestApplication<NestNodeApplication>(
    new NodeAdapter(),
    options,
  );
  app.enableVersioning({ type: VersioningType.URI });
  return app;
}

// The Node adapter counterpart of the Fastify spec: URI versioning + a
// wildcard sharing a prefix with a literal route, through the deferred
// registration path of `NestApplication.registerRouter`.
//
// The fixture uses Fastify's `@Get('*')`. On the Node adapter, as on Express,
// the legacy converter turns it into the optional named wildcard `{*path}`:
// the tail is exposed as `path` (so `@Param('*')` is undefined), and the bare
// `/v1/users` matches the catch-all too.
describe('Route conflict policy (Node, URI versioning + wildcard)', () => {
  let app: NestNodeApplication | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it('boots with shadow=error because the shadow policy is filtered out', async () => {
    // The detector reports `/v1/users/me` vs `/v1/users/*path` as a
    // shadow pair, but the Node adapter matches by specificity (it is not
    // order-sensitive), so `filteredPolicy` drops the shadow level.
    app = await buildVersionedNodeApp({
      routeConflictPolicy: { shadow: 'error' },
    });
    await expect(listenOnLoopback(app)).resolves.toBeDefined();
  });

  describe('runtime routing under URI versioning', () => {
    beforeEach(async () => {
      app = await buildVersionedNodeApp({});
      await listenOnLoopback(app);
    });

    it('routes GET /v1/users/me to the literal handler (UsersMeController)', async () => {
      await request(app!.getHttpServer())
        .get('/v1/users/me')
        .expect(200, { handler: 'me' });
    });

    it('routes GET /v1/users/anything to the versioned wildcard handler', async () => {
      await request(app!.getHttpServer())
        .get('/v1/users/anything')
        .expect(200, { handler: 'catchAll' });
    });

    it('routes GET /v1/users/a/b/c to the wildcard (absorbs multi-segment tail)', async () => {
      await request(app!.getHttpServer())
        .get('/v1/users/a/b/c')
        .expect(200, { handler: 'catchAll' });
    });

    it('routes GET /v1/users to the wildcard as well (the converted wildcard is optional)', async () => {
      await request(app!.getHttpServer())
        .get('/v1/users')
        .expect(200, { handler: 'catchAll' });
    });

    it('routes the unversioned handler outside the /v1 prefix', async () => {
      await request(app!.getHttpServer())
        .get('/users/profile')
        .expect(200, { handler: 'profile' });
    });
  });

  it('still routes correctly through the deferred-registration path when a conflict policy is set', async () => {
    // Setting any policy flips `registerRouter` into the deferred
    // install pass (`registerResolvedRoute`). This asserts the version
    // filter survives that detour for a wildcard handler.
    app = await buildVersionedNodeApp({
      routeConflictPolicy: { duplicate: 'error' },
    });
    await listenOnLoopback(app);

    await request(app.getHttpServer())
      .get('/v1/users/me')
      .expect(200, { handler: 'me' });
    await request(app.getHttpServer())
      .get('/v1/users/anything')
      .expect(200, { handler: 'catchAll' });
  });
});
