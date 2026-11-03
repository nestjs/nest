import type { INestApplication } from '@nestjs/common';
import { NodeAdapter } from '@nestjs/platform-node';
import request from 'supertest';
import { adapters, createApp } from '../src/adapters.js';
import {
  CatchEverythingFilter,
  NodeSpecificsModule,
} from '../src/node-specifics/node-specifics.module.js';

const long = (length: number) => 'x'.repeat(length);

// Where the Node adapter follows Fastify rather than Express
describe.each(adapters('fastify', 'node'))(
  'Route parameter length (%s)',
  name => {
    let app: INestApplication;
    const get = (path: string) => request(app.getHttpServer()).get(path);

    beforeAll(async () => {
      app = await createApp(name, NodeSpecificsModule);
    });

    afterAll(async () => {
      await app.close();
    });

    it('should match parameters of up to 100 characters', async () => {
      const res = await get(`/items/${long(100)}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ length: 100 });
    });

    it('should answer a longer parameter no other route matches with 414', async () => {
      expect((await get(`/items/${long(101)}`)).status).toBe(414);
      // The decoded length counts
      expect((await get(`/items/${'%2F'.repeat(101)}`)).status).toBe(414);
    });

    it('should let a sibling catch-all route take a longer parameter', async () => {
      const res = await get(`/files/${long(101)}`);

      expect(res.status).toBe(200);
      expect(res.text).toBe('catch-all');
    });

    it('should answer paths that are not routes with 404, however long', async () => {
      expect((await get(`/nowhere/${long(101)}`)).status).toBe(404);
    });

    it('should match paths case-sensitively', async () => {
      expect((await get('/cats')).status).toBe(200);
      expect((await get('/CATS')).status).toBe(404);
      expect((await get('/admin/x')).status).toBe(200);
      expect((await get('/ADMIN/x')).status).toBe(404);
    });
  },
);

describe('Node adapter specifics', () => {
  let app: INestApplication;
  const get = (path: string) => request(app.getHttpServer()).get(path);

  afterEach(async () => {
    await app.close();
  });

  describe('maxParamLength', () => {
    it('should answer with a 414 Nest error body', async () => {
      app = await createApp('node', NodeSpecificsModule);

      const res = await get(`/items/${long(101)}`);

      expect(res.status).toBe(414);
      expect(res.body).toEqual({
        statusCode: 414,
        message: 'Route parameter too long',
      });
    });

    it('should let exception filters handle the 414', async () => {
      app = await createApp('node', NodeSpecificsModule, app =>
        app.useGlobalFilters(new CatchEverythingFilter()),
      );

      const res = await get(`/items/${long(101)}`);

      expect(res.status).toBe(414);
      expect(res.body).toEqual({ filtered: true, status: 414 });
    });

    it('should take the limit from the adapter options', async () => {
      app = await createApp(
        'node',
        NodeSpecificsModule,
        undefined,
        {},
        new NodeAdapter({ maxParamLength: 200 }),
      );

      expect((await get(`/items/${long(150)}`)).body).toEqual({
        length: 150,
      });
      expect((await get(`/items/${long(201)}`)).status).toBe(414);
    });
  });

  describe('case sensitivity', () => {
    beforeEach(async () => {
      app = await createApp('node', NodeSpecificsModule);
    });

    it('should not run the middleware of a route for a path in another case', async () => {
      const lower = await get('/cats');
      const upper = await get('/CATS');
      const catchAll = await get('/ADMIN/x');

      expect(lower.headers['x-middleware']).toBe('ran');
      expect(upper.status).toBe(404);
      expect(upper.headers['x-middleware']).toBeUndefined();
      expect(catchAll.status).toBe(404);
      expect(catchAll.headers['x-middleware']).toBeUndefined();
    });
  });

  describe('requests outside the global prefix', () => {
    beforeEach(async () => {
      app = await createApp('node', NodeSpecificsModule, app =>
        app.setGlobalPrefix('api'),
      );
    });

    it('should echo the path as received, and forbid sniffing and scripts', async () => {
      const res = await get('/%3Cscript%3Ealert(1)%3C/script%3E?x=1');

      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['content-security-policy']).toBe("default-src 'none'");
      expect(res.text).toBe('Cannot GET /%3Cscript%3Ealert(1)%3C/script%3E');
    });

    it('should send no body in answer to HEAD', async () => {
      const res = await request(app.getHttpServer()).head('/elsewhere');

      expect(res.status).toBe(404);
      expect(res.text ?? '').toBe('');
    });
  });
});
