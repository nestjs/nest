import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { adapters, createApp } from '../src/adapters.js';
import { TrailingSlashModule } from '../src/trailing-slash/trailing-slash.module.js';

// A catch-all registered before more specific routes of its controller, with
// middleware excluded for one of them ("files/public"). Express and Node
// treat "/files/public/" as "/files/public" (as their exclude() does), while
// Fastify treats it as another path.
const ignoresTrailingSlash = { express: true, fastify: false, node: true };

describe.each(adapters('express', 'fastify', 'node'))(
  'Paths ending with "/" (%s)',
  name => {
    let app: INestApplication;
    const get = (path: string) => request(app.getHttpServer()).get(path);

    beforeEach(async () => {
      app = await createApp(name, TrailingSlashModule);
    });

    afterEach(async () => {
      await app.close();
    });

    it('should run the middleware for every path but the excluded one', async () => {
      const excluded = ignoresTrailingSlash[name]
        ? ['/files/public', '/files/public/']
        : ['/files/public'];
      for (const path of [
        '/files/public',
        '/files/public/',
        '/files/42',
        '/files/42/',
        '/files/a/b',
        '/files/a/b/',
      ]) {
        const res = await get(path);

        expect(res.status).toBe(200);
        expect(res.headers['x-middleware']).toBe(
          excluded.includes(path) ? undefined : 'ran',
        );
      }
    });

    it('should give the more specific routes their paths', async () => {
      const handlers = await Promise.all(
        ['/files/public', '/files/42', '/files/a/b'].map(
          async path => (await get(path)).text,
        ),
      );

      expect(handlers).toEqual(
        name === 'express'
          ? ['catch-all', 'catch-all', 'catch-all']
          : ['public', 'by id', 'catch-all'],
      );
    });

    if (ignoresTrailingSlash[name]) {
      it('should send a path ending with "/" to the route it would go to without it', async () => {
        for (const path of ['/files/public', '/files/42', '/files/a/b']) {
          const [res, withSlash] = await Promise.all([
            get(path),
            get(`${path}/`),
          ]);

          expect(withSlash.text).toBe(res.text);
          expect(withSlash.headers['x-middleware']).toBe(
            res.headers['x-middleware'],
          );
        }
      });
    }
  },
);
