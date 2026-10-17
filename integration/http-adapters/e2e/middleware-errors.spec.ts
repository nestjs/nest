import { HttpException, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { adapters, createApp } from '../src/adapters.js';
import {
  ClassMiddlewareErrorsModule,
  CsrfError,
  CsrfErrorFilter,
  ErrorsModule,
} from '../src/errors/errors.module.js';

// Errors raised by middleware reach Nest's exception handling as they were
// raised: `@Catch()` filters see the original error (class and code), and
// without a filter, http-errors-style errors answer with their own status.
describe.each(adapters('express', 'fastify', 'node'))(
  'Errors from middleware (%s)',
  name => {
    let app: INestApplication;
    const get = (path: string) => request(app.getHttpServer()).get(path);

    afterEach(async () => {
      await app.close();
    });

    it('should hand an error passed to next() by app.use() middleware to a @Catch() filter as it is', async () => {
      app = await createApp(name, ErrorsModule, app => {
        app.use((_req: unknown, _res: unknown, next: (e: unknown) => void) =>
          next(new CsrfError()),
        );
        app.useGlobalFilters(new CsrfErrorFilter());
      });

      const res = await get('/ok');

      expect(res.status).toBe(499);
      expect(res.body).toEqual({
        caught: 'CsrfError',
        code: 'EBADCSRFTOKEN',
        isCsrfError: true,
      });
    });

    it('should hand an error from a class middleware to a @Catch() filter as it is', async () => {
      app = await createApp(name, ClassMiddlewareErrorsModule, app =>
        app.useGlobalFilters(new CsrfErrorFilter()),
      );

      const res = await get('/guarded');

      expect(res.status).toBe(499);
      expect(res.body.isCsrfError).toBe(true);
    });

    it('should answer an http-errors-style error with its status and message without a filter', async () => {
      app = await createApp(name, ErrorsModule, app =>
        app.use((_req: unknown, _res: unknown, next: (e: unknown) => void) =>
          next(new CsrfError()),
        ),
      );

      const res = await get('/ok');

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        statusCode: 403,
        message: 'invalid csrf token',
      });
    });

    it('should answer an error thrown synchronously by middleware the same way', async () => {
      app = await createApp(name, ErrorsModule, app =>
        app.use(() => {
          throw new CsrfError();
        }),
      );

      expect((await get('/ok')).status).toBe(403);
    });

    it('should answer a plain { statusCode, message } object with its status', async () => {
      app = await createApp(name, ErrorsModule, app =>
        app.use((_req: unknown, _res: unknown, next: (e: unknown) => void) =>
          next({ statusCode: 422, message: 'plain object' }),
        ),
      );

      const res = await get('/ok');

      expect(res.status).toBe(422);
      expect(res.body).toEqual({ statusCode: 422, message: 'plain object' });
    });

    it('should answer an HttpException from middleware with its response', async () => {
      app = await createApp(name, ErrorsModule, app =>
        app.use((_req: unknown, _res: unknown, next: (e: unknown) => void) =>
          next(new HttpException({ reason: 'teapot' }, 418)),
        ),
      );

      const res = await get('/ok');

      expect(res.status).toBe(418);
      expect(res.body).toEqual({ reason: 'teapot' });
    });
  },
);

// Fastify's middleware engine leaves the rejection of an async middleware
// unhandled
describe.each(adapters('express', 'node'))(
  'Errors from async middleware (%s)',
  name => {
    let app: INestApplication;

    afterEach(async () => {
      await app.close();
    });

    it('should hand the rejection to a @Catch() filter as it is', async () => {
      app = await createApp(name, ErrorsModule, app => {
        app.use(async () => {
          throw new CsrfError();
        });
        app.useGlobalFilters(new CsrfErrorFilter());
      });

      const res = await request(app.getHttpServer()).get('/ok');

      expect(res.status).toBe(499);
      expect(res.body.isCsrfError).toBe(true);
    });
  },
);
