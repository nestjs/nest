import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { adapters, createApp } from '../src/adapters.js';
import {
  FallThroughModule,
  HostFallThroughModule,
} from '../src/fall-through/fall-through.module.js';

// When the most specific route matching a path does not apply (its version
// or host filter calls `next()`), the request falls through to the other
// routes matching the path, here "/<prefix>/:id".

const versioning = [
  {
    type: 'header',
    options: { type: VersioningType.HEADER, header: 'v' },
    version: (v: string) => ({ v }),
  },
  {
    type: 'media type',
    options: { type: VersioningType.MEDIA_TYPE, key: 'v=' },
    version: (v: string) => ({ accept: `application/json;v=${v}` }),
  },
  {
    type: 'custom',
    options: {
      type: VersioningType.CUSTOM,
      extractor: (req: any) =>
        String((req.headers ?? req.raw.headers)['x-version'] ?? ''),
    },
    version: (v: string) => ({ 'x-version': v }),
  },
] as const;

describe.each(adapters('express', 'fastify', 'node'))(
  'Falling through to less specific routes (%s)',
  name => {
    let app: INestApplication;

    afterEach(async () => {
      await app.close();
    });

    describe.each(versioning)(
      'with $type versioning',
      ({ options, version }) => {
        beforeEach(async () => {
          app = await createApp(name, FallThroughModule, app =>
            app.enableVersioning(options as any),
          );
        });

        const send = (
          method: 'get' | 'delete',
          path: string,
          v: string | undefined,
        ) =>
          request(app.getHttpServer())
            [method](path)
            .set(v ? version(v) : {});

        it('should fall through to ":id" when the literal route is for another version', async () => {
          const v1 = await send('get', '/items/me', '1');
          const v2 = await send('get', '/items/me', '2');

          expect(v1.status).toBe(200);
          expect(v1.text).toBe('id v1 me');
          expect(v2.text).toBe('me v2');
        });

        it('should answer 404 when no route matches the version', async () => {
          expect((await send('get', '/items/me', '9')).status).toBe(404);
          expect((await send('get', '/items/5', '9')).status).toBe(404);
        });

        it('should fall through to a version-neutral route', async () => {
          expect((await send('get', '/neutral/me', '1')).text).toBe(
            'id neutral me',
          );
          expect((await send('get', '/neutral/me', undefined)).text).toBe(
            'id neutral me',
          );
          expect((await send('get', '/neutral/me', '2')).text).toBe('me v2');
        });

        it('should fall through to a route for several versions', async () => {
          expect((await send('get', '/many/me', '3')).text).toBe('id v1|v3 me');
          expect((await send('get', '/many/me', '4')).status).toBe(404);
        });

        it('should fall through to a route for every method', async () => {
          expect((await send('get', '/any/me', '1')).text).toBe('all v1 me');
          expect((await send('delete', '/any/me', '1')).text).toBe('all v1 me');
        });
      },
    );

    describe('with a global prefix and header versioning', () => {
      beforeEach(async () => {
        app = await createApp(name, FallThroughModule, app => {
          app.setGlobalPrefix('api');
          app.enableVersioning({ type: VersioningType.HEADER, header: 'v' });
        });
      });

      it('should fall through under the prefix', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/items/me')
          .set('v', '1');

        expect(res.text).toBe('id v1 me');
      });
    });

    describe('with URI versioning', () => {
      beforeEach(async () => {
        app = await createApp(name, FallThroughModule, app =>
          app.enableVersioning({ type: VersioningType.URI }),
        );
      });

      it('should route each version by its path', async () => {
        const get = (path: string) => request(app.getHttpServer()).get(path);

        expect((await get('/v1/items/me')).text).toBe('id v1 me');
        expect((await get('/v2/items/me')).text).toBe('me v2');
        expect((await get('/v2/items/5')).status).toBe(404);
      });
    });
  },
);

// Fastify does not support host filters
describe.each(adapters('express', 'node'))(
  'Falling through from a host-filtered route (%s)',
  name => {
    let app: INestApplication;

    beforeEach(async () => {
      app = await createApp(name, HostFallThroughModule);
    });

    afterEach(async () => {
      await app.close();
    });

    it('should fall through to ":id" when the host does not match', async () => {
      const tenant = await request(app.getHttpServer())
        .get('/tenants/me')
        .set('host', 'acme.example.com');
      const other = await request(app.getHttpServer())
        .get('/tenants/me')
        .set('host', 'other.org');

      expect(tenant.text).toBe('tenant me');
      expect(other.text).toBe('any host me');
    });
  },
);
