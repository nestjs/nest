import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { adapters, createApp } from '../src/adapters.js';
import {
  RootCatchAllModule,
  WildcardsModule,
} from '../src/wildcards/wildcards.module.js';

// Express and Node only: Fastify rejects the "{*path}" and "{:id}" syntax.
// A wildcard or optional group after a "/" ("/admin/{*path}") matches
// "/admin/" and below, never the bare "/admin", and the middleware of the
// route sees exactly the requests the route does.
describe.each(adapters('express', 'node'))(
  'Wildcard and optional routes (%s)',
  name => {
    let app: INestApplication;
    const get = (path: string) => request(app.getHttpServer()).get(path);

    afterEach(async () => {
      await app.close();
    });

    describe('with middleware applied to their controllers', () => {
      beforeEach(async () => {
        app = await createApp(name, WildcardsModule);
      });

      it('should route the bare path to the index route, and below it to the legacy "*" catch-all', async () => {
        const index = await get('/admin');
        const catchAll = await get('/admin/x');
        const withSlash = await get('/admin/x/');
        const doubleSlash = await get('/admin//x');

        expect(index.status).toBe(200);
        expect(index.text).toBe('admin index');
        expect(index.headers['x-middleware']).toBe('ran');
        for (const res of [catchAll, withSlash, doubleSlash]) {
          expect(res.status).toBe(200);
          expect(res.text).toBe('admin catch-all');
          expect(res.headers['x-middleware']).toBe('ran');
        }
      });

      it('should run the middleware for HEAD requests to a catch-all', async () => {
        const res = await request(app.getHttpServer()).head('/admin/x');

        expect(res.status).toBe(200);
        expect(res.headers['x-middleware']).toBe('ran');
      });

      it('should not match a "{*path}" route on the bare path, nor run its middleware', async () => {
        const bare = await get('/named');
        const root = await get('/named/');
        const nested = await get('/named/a/b');

        expect(bare.status).toBe(404);
        expect(bare.headers['x-middleware']).toBeUndefined();
        expect(root.status).toBe(200);
        expect(root.body).toEqual({ path: null });
        expect(root.headers['x-middleware']).toBe('ran');
        expect(nested.body).toEqual({ path: ['a', 'b'] });
        expect(nested.headers['x-middleware']).toBe('ran');
      });

      it('should not match a "{:id}" route on the bare path, nor run its middleware', async () => {
        const bare = await get('/optional');
        const root = await get('/optional/');
        const withId = await get('/optional/1');

        expect(bare.status).toBe(404);
        expect(bare.headers['x-middleware']).toBeUndefined();
        expect(root.body).toEqual({ id: null });
        expect(root.headers['x-middleware']).toBe('ran');
        expect(withId.body).toEqual({ id: '1' });
      });
    });

    describe('optional groups and wildcards', () => {
      beforeEach(async () => {
        app = await createApp(name, WildcardsModule);
      });

      it('should match an optional trailing slash group with and without the slash', async () => {
        expect((await get('/docs')).text).toBe('docs');
        expect((await get('/docs/')).text).toBe('docs');
      });

      it('should match an optional extension group with and without the extension only', async () => {
        expect((await get('/files')).text).toBe('files');
        expect((await get('/files.json')).text).toBe('files');
        expect((await get('/files.xml')).status).toBe(404);
      });

      it('should match an optional parameter in the middle of the path', async () => {
        expect((await get('/users/posts')).body).toEqual({});
        expect((await get('/users/1/posts')).body).toEqual({ id: '1' });
        expect((await get('/users//posts')).status).toBe(404);
      });

      it('should split a wildcard before decoding it, keeping an encoded "/" in its segment', async () => {
        expect((await get('/wild/a%2Fb/c')).body).toEqual(['a/b', 'c']);
        expect((await get('/wild/100%25/a%20b')).body).toEqual(['100%', 'a b']);
      });
    });

    describe('a root catch-all under a global prefix', () => {
      beforeEach(async () => {
        app = await createApp(name, RootCatchAllModule, app =>
          app.setGlobalPrefix('api'),
        );
      });

      it('should not match the bare prefix', async () => {
        expect((await get('/api')).status).toBe(404);
        expect((await get('/api/')).text).toBe('catch-all');
        expect((await get('/api/x')).text).toBe('catch-all');
      });
    });
  },
);

// A route registered on the adapter itself, the way @nestjs/serve-static
// registers the fallback of a single-page app ("{*any}", without a "/")
describe.each(adapters('express', 'node'))(
  'A route path without a leading "/" (%s)',
  name => {
    let app: INestApplication;

    afterEach(async () => {
      await app.close();
    });

    it('should match every path, as "{*any}" does with Express', async () => {
      app = await createApp(name, WildcardsModule, app =>
        app
          .getHttpAdapter()
          .get('{*any}', (req: any, res: any) =>
            res.json({ any: req.params.any }),
          ),
      );

      const res = await request(app.getHttpServer()).get('/some/spa/route');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ any: ['', 'some', 'spa', 'route'] });
    });
  },
);
