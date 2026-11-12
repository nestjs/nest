import { FastifyAdapter } from '../../adapters/fastify-adapter';
import {
  FASTIFY_ROUTE_CONFIG_METADATA,
  FASTIFY_ROUTE_CONSTRAINTS_METADATA,
  FASTIFY_ROUTE_SCHEMA_METADATA,
} from '../../constants.js';
import { createError } from '@fastify/error';
import middie from '@fastify/middie';
import createHttpError from 'http-errors';
import {
  HttpException,
  Logger,
  RawBodyRequest,
  RequestMethod,
  StreamableFile,
  VERSION_NEUTRAL,
  VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import { LegacyRouteConverter } from '@nestjs/core/internal';
import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  fastify,
} from 'fastify';
import { inject } from 'light-my-request';
import { PassThrough } from 'stream';

describe('FastifyAdapter', () => {
  let fastifyAdapter: FastifyAdapter;

  beforeEach(() => {
    fastifyAdapter = new FastifyAdapter();
  });

  afterEach(() => vi.restoreAllMocks());

  describe('reply', () => {
    const createReply = () => ({
      status: vi.fn(),
      send: vi.fn(),
      getHeader: vi.fn(),
      header: vi.fn(),
    });

    it('should apply the given status code', () => {
      const reply = createReply();

      fastifyAdapter.reply(reply as any, { message: 'Oops' }, 404);

      expect(reply.status).toHaveBeenCalledWith(404);
    });

    it('should not apply any status code when it is omitted', () => {
      const reply = createReply();

      fastifyAdapter.reply(reply as any, { message: 'Hello' });

      expect(reply.status).not.toHaveBeenCalled();
    });

    it('should apply falsy status codes instead of dropping them', () => {
      // "0" and "NaN" are falsy, but they were still passed in. Forwarding them
      // lets fastify reject the value, whereas skipping the call leaves the
      // status that was set before the handler ran (200/201), so an error would
      // be sent with a successful status code.
      for (const statusCode of [0, NaN]) {
        const reply = createReply();

        fastifyAdapter.reply(reply as any, { message: 'Oops' }, statusCode);

        expect(reply.status).toHaveBeenCalledWith(statusCode);
      }
    });

    it('should keep a JSON content type that carries parameters', () => {
      const reply = createReply();
      reply.getHeader.mockReturnValue('application/json; charset=utf-8');

      fastifyAdapter.reply(
        reply as any,
        { statusCode: 400, message: 'Oops' },
        400,
      );

      expect(reply.header).not.toHaveBeenCalled();
    });

    it.each([
      'application/problem+json',
      'application/vnd.api+json; charset=utf-8',
      'Application/JSON',
    ])('should keep the "%s" JSON content type for error bodies', type => {
      const reply = createReply();
      reply.getHeader.mockReturnValue(type);
      const warnSpy = vi.spyOn(Logger, 'warn').mockImplementation(() => {});

      fastifyAdapter.reply(
        reply as any,
        { statusCode: 400, message: 'Oops' },
        400,
      );

      expect(reply.header).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should force a JSON content type for error bodies sent with a non-JSON content type', () => {
      const reply = createReply();
      reply.getHeader.mockReturnValue('text/html');

      fastifyAdapter.reply(
        reply as any,
        { statusCode: 400, message: 'Oops' },
        400,
      );

      expect(reply.header).toHaveBeenCalledWith(
        'Content-Type',
        'application/json',
      );
    });

    it.each([
      ['without a "statusCode"', { errors: ['name is required'] }, 400],
      [
        'with a "statusCode" when no status code is given',
        { statusCode: 404 },
        undefined,
      ],
    ])(
      'should force a JSON content type for error bodies %s',
      (_, body, statusCode) => {
        const reply = createReply();
        reply.getHeader.mockReturnValue('text/html');
        const warnSpy = vi.spyOn(Logger, 'warn').mockImplementation(() => {});

        fastifyAdapter.reply(reply as any, body, statusCode);

        expect(reply.header).toHaveBeenCalledWith(
          'Content-Type',
          'application/json',
        );
        expect(warnSpy).toHaveBeenCalled();
        expect(reply.send).toHaveBeenCalledWith(body);
      },
    );

    it.each([
      ['a text error body', '<h1>Not found</h1>', 404],
      ['a Buffer error body', Buffer.from('id,name'), 404],
      ['a stream error body', new PassThrough(), 404],
      ['a web stream error body', new ReadableStream(), 404],
      ['a Response error body', new Response('id,name'), 404],
      ['an object body with a successful status', { id: 1 }, 200],
    ])('should keep the content type of %s', (_, body, statusCode) => {
      const reply = createReply();
      reply.getHeader.mockReturnValue('text/csv');

      fastifyAdapter.reply(reply as any, body, statusCode);

      expect(reply.header).not.toHaveBeenCalled();
      expect(reply.send).toHaveBeenCalledWith(body);
    });

    it('should answer a custom error body with its status on a route with a non-JSON content type', async () => {
      vi.spyOn(Logger, 'warn').mockImplementation(() => {});
      fastifyAdapter.get('/', (_req: FastifyRequest, reply: FastifyReply) => {
        reply.header('Content-Type', 'text/csv');
        // e.g. the response of `new NotFoundException({ code, message })`
        fastifyAdapter.reply(reply, { code: 'REPORT_NOT_FOUND' }, 404);
      });

      const res = await fastifyAdapter.inject({ method: 'GET', url: '/' });

      expect(res.statusCode).toBe(404);
      expect(res.json()).toEqual({ code: 'REPORT_NOT_FOUND' });
      await fastifyAdapter.close();
    });

    it('should keep the content type of an error body sent through a reply serializer', async () => {
      fastifyAdapter.get('/', (_req: FastifyRequest, reply: FastifyReply) => {
        reply.header('Content-Type', 'text/csv');
        reply.serializer((payload: any) => Object.values(payload).join(','));
        fastifyAdapter.reply(reply, { code: 'REPORT_NOT_FOUND' }, 404);
      });

      const res = await fastifyAdapter.inject({ method: 'GET', url: '/' });

      expect(res.statusCode).toBe(404);
      expect(res.headers['content-type']).toBe('text/csv');
      expect(res.body).toBe('REPORT_NOT_FOUND');
      await fastifyAdapter.close();
    });

    // e.g. `new UnauthorizedException(err)`, whose response is `err`. On the
    // raw response middleware gets, Fastify's reply has no error handler.
    it.each([
      ['a raw response', true],
      ['a reply', false],
    ])(
      'should send the standard body of the status for an Error body on %s',
      async (_, raw) => {
        fastifyAdapter.get('/', (_req: FastifyRequest, reply: FastifyReply) => {
          const error = Object.assign(new Error('invalid signature'), {
            config: { headers: { authorization: 'Bearer secret' } },
          });
          if (raw) {
            reply.hijack();
          }
          fastifyAdapter.reply(raw ? reply.raw : reply, error, 401);
        });

        const res = await fastifyAdapter.inject({ method: 'GET', url: '/' });

        expect(res.statusCode).toBe(401);
        expect(res.json()).toEqual({
          statusCode: 401,
          message: 'Unauthorized',
        });
        await fastifyAdapter.close();
      },
    );

    it('should leave out the Content-Length of a StreamableFile when the Transfer-Encoding is set', async () => {
      fastifyAdapter.get('/', (_req: FastifyRequest, reply: FastifyReply) => {
        reply.header('Transfer-Encoding', 'chunked');
        fastifyAdapter.reply(
          reply,
          new StreamableFile(Buffer.from('hello world'), { length: 11 }),
        );
      });

      const res = await fastifyAdapter.inject({ method: 'GET', url: '/' });

      expect(res.headers['transfer-encoding']).toBe('chunked');
      expect(res.headers['content-length']).toBeUndefined();
      expect(res.body).toBe('hello world');
      await fastifyAdapter.close();
    });

    it('should destroy the stream of a StreamableFile once the reply was sent', () => {
      // e.g. by Fastify's `handlerTimeout`: send() then drops the stream
      const reply = { ...createReply(), sent: true };
      const source = new PassThrough();

      fastifyAdapter.reply(reply as any, new StreamableFile(source));

      expect(source.destroyed).toBe(true);
    });
  });

  describe('mapException', () => {
    it('should map FastifyError with status code to HttpException', () => {
      const FastifyErrorCls = createError(
        'FST_ERR_CTP_INVALID_MEDIA_TYPE',
        'Unsupported Media Type: %s',
        415,
      );
      const error = new FastifyErrorCls();

      const result = fastifyAdapter.mapException(error) as HttpException;

      expect(result).toBeInstanceOf(HttpException);
      expect(result.message).toBe(error.message);
      expect(result.getStatus()).toBe(415);
      expect(result.cause).toBe(error);
    });

    it('should not map FastifyError without user status code (500 by default)', () => {
      const FastifyErrorCls = createError(
        'FST_WITHOUT_STATUS_CODE',
        'Error without status code',
      );
      const error = new FastifyErrorCls();

      expect(fastifyAdapter.mapException(error)).toBe(error);
    });

    it.each([500, 503])(
      'should not map FastifyError with status %i',
      status => {
        const FastifyErrorCls = createError(
          'FST_ERR_TEST',
          'internal detail',
          status,
        );
        const error = new FastifyErrorCls();

        expect(fastifyAdapter.mapException(error)).toBe(error);
      },
    );

    it('should return error if it is not FastifyError', () => {
      const error = new Error('Test error');
      const result = fastifyAdapter.mapException(error);
      expect(result).toBe(error);
    });

    it('should map an http-errors error to an HttpException', () => {
      const error = createHttpError(413, 'request entity too large');
      const result = fastifyAdapter.mapException(error) as HttpException;
      expect(result).toBeInstanceOf(HttpException);
      expect(result.getStatus()).toBe(413);
      expect(result.getResponse()).toBe('request entity too large');
      expect(result.cause).toBe(error);
    });

    it('should not expose the message of an http-errors error with expose: false', () => {
      const error = createHttpError(404, 'internal detail', { expose: false });
      const result = fastifyAdapter.mapException(error) as HttpException;
      expect(result.getStatus()).toBe(404);
      expect(result.getResponse()).toBe('Not Found');
    });

    it.each([500, 503])(
      'should not map an http-errors error with status %i',
      status => {
        const error = createHttpError(status, 'internal detail');
        expect(fastifyAdapter.mapException(error)).toBe(error);
      },
    );

    it('should not map an error that only carries a status code', () => {
      const error = Object.assign(new Error('Test error'), { statusCode: 400 });
      expect(fastifyAdapter.mapException(error)).toBe(error);
    });
  });

  describe('isHeadersSent', () => {
    it('should report headers written to the raw response as sent', async () => {
      let headersSent: Record<string, boolean> | undefined;
      fastifyAdapter.initHttpServer();
      fastifyAdapter.get('/p', (_req, reply) => {
        reply.raw.writeHead(200);
        headersSent = {
          reply: fastifyAdapter.isHeadersSent(reply),
          // Nest middleware receives the raw response instead of the reply.
          raw: fastifyAdapter.isHeadersSent(reply.raw),
        };
        reply.raw.end();
      });

      await fastifyAdapter.getInstance().ready();
      await fastifyAdapter.inject({ method: 'GET', url: '/p' });

      expect(headersSent).toEqual({ reply: true, raw: true });
      await fastifyAdapter.close();
    });
  });

  describe('end', () => {
    it('should end a raw response whose headers were already sent', async () => {
      fastifyAdapter.initHttpServer();
      fastifyAdapter.get('/p', (_req, reply) => {
        reply.raw.writeHead(200);
        // Nest middleware receives the raw response instead of the reply.
        fastifyAdapter.end(reply.raw, 'partial');
      });

      await fastifyAdapter.getInstance().ready();
      const response = await fastifyAdapter.inject({
        method: 'GET',
        url: '/p',
      });

      expect(response.payload).toBe('partial');
      await fastifyAdapter.close();
    });
  });

  describe('appendHeader', () => {
    it('should append to an existing header instead of overwriting it', async () => {
      fastifyAdapter.initHttpServer();
      fastifyAdapter.get('/p', (_req, reply) => {
        fastifyAdapter.appendHeader(reply, 'x-a', '1');
        fastifyAdapter.appendHeader(reply, 'x-a', '2');
        fastifyAdapter.reply(reply, {
          got: fastifyAdapter.getHeader(reply, 'x-a'),
        });
      });

      await fastifyAdapter.getInstance().ready();
      const res = await fastifyAdapter.inject({ method: 'GET', url: '/p' });

      expect(JSON.parse(res.body).got).toEqual(['1', '2']);
      await fastifyAdapter.close();
    });

    it('should append after setHeader', async () => {
      fastifyAdapter.initHttpServer();
      fastifyAdapter.get('/p', (_req, reply) => {
        fastifyAdapter.setHeader(reply, 'x-a', '1');
        fastifyAdapter.appendHeader(reply, 'x-a', '2');
        fastifyAdapter.reply(reply, {
          got: fastifyAdapter.getHeader(reply, 'x-a'),
        });
      });

      await fastifyAdapter.getInstance().ready();
      const res = await fastifyAdapter.inject({ method: 'GET', url: '/p' });

      expect(JSON.parse(res.body).got).toEqual(['1', '2']);
      await fastifyAdapter.close();
    });

    it('should append when header names differ only by case', async () => {
      fastifyAdapter.initHttpServer();
      fastifyAdapter.get('/p', (_req, reply) => {
        fastifyAdapter.appendHeader(reply, 'X-A', '1');
        fastifyAdapter.appendHeader(reply, 'x-a', '2');
        fastifyAdapter.reply(reply, {
          got: fastifyAdapter.getHeader(reply, 'X-A'),
        });
      });

      await fastifyAdapter.getInstance().ready();
      const res = await fastifyAdapter.inject({ method: 'GET', url: '/p' });

      expect(JSON.parse(res.body).got).toEqual(['1', '2']);
      await fastifyAdapter.close();
    });

    it('should append more than two values', async () => {
      fastifyAdapter.initHttpServer();
      fastifyAdapter.get('/p', (_req, reply) => {
        fastifyAdapter.appendHeader(reply, 'x-a', '1');
        fastifyAdapter.appendHeader(reply, 'x-a', '2');
        fastifyAdapter.appendHeader(reply, 'x-a', '3');
        fastifyAdapter.reply(reply, {
          got: fastifyAdapter.getHeader(reply, 'x-a'),
        });
      });

      await fastifyAdapter.getInstance().ready();
      const res = await fastifyAdapter.inject({ method: 'GET', url: '/p' });

      expect(JSON.parse(res.body).got).toEqual(['1', '2', '3']);
      await fastifyAdapter.close();
    });

    it('should still append set-cookie values', async () => {
      fastifyAdapter.initHttpServer();
      fastifyAdapter.get('/p', (_req, reply) => {
        fastifyAdapter.appendHeader(reply, 'set-cookie', 'a=1');
        fastifyAdapter.appendHeader(reply, 'set-cookie', 'b=2');
        fastifyAdapter.reply(reply, {
          got: fastifyAdapter.getHeader(reply, 'set-cookie'),
        });
      });

      await fastifyAdapter.getInstance().ready();
      const res = await fastifyAdapter.inject({ method: 'GET', url: '/p' });

      expect(JSON.parse(res.body).got).toEqual(['a=1', 'b=2']);
      await fastifyAdapter.close();
    });

    it('should not duplicate set-cookie when appending a third value', async () => {
      fastifyAdapter.initHttpServer();
      fastifyAdapter.get('/p', (_req, reply) => {
        fastifyAdapter.appendHeader(reply, 'set-cookie', 'a=1');
        fastifyAdapter.appendHeader(reply, 'set-cookie', 'b=2');
        fastifyAdapter.appendHeader(reply, 'set-cookie', 'c=3');
        fastifyAdapter.reply(reply, {
          got: fastifyAdapter.getHeader(reply, 'set-cookie'),
        });
      });

      await fastifyAdapter.getInstance().ready();
      const res = await fastifyAdapter.inject({ method: 'GET', url: '/p' });

      expect(JSON.parse(res.body).got).toEqual(['a=1', 'b=2', 'c=3']);
      await fastifyAdapter.close();
    });

    it('should keep a set-cookie value when it is already on the raw response', async () => {
      fastifyAdapter.initHttpServer();
      fastifyAdapter.get('/p', (_req, reply) => {
        reply.raw.setHeader('set-cookie', 'session=abc');
        fastifyAdapter.appendHeader(reply, 'set-cookie', 'theme=dark');
        fastifyAdapter.reply(reply, {});
      });

      await fastifyAdapter.getInstance().ready();
      const res = await fastifyAdapter.inject({ method: 'GET', url: '/p' });

      expect(res.headers['set-cookie']).toEqual(['session=abc', 'theme=dark']);
      await fastifyAdapter.close();
    });

    it('should not duplicate a raw set-cookie value when appending twice', async () => {
      fastifyAdapter.initHttpServer();
      fastifyAdapter.get('/p', (_req, reply) => {
        reply.raw.setHeader('set-cookie', 'session=abc');
        fastifyAdapter.appendHeader(reply, 'set-cookie', 'a=1');
        fastifyAdapter.appendHeader(reply, 'set-cookie', 'b=2');
        fastifyAdapter.reply(reply, {});
      });

      await fastifyAdapter.getInstance().ready();
      const res = await fastifyAdapter.inject({ method: 'GET', url: '/p' });

      expect(res.headers['set-cookie']).toEqual(['session=abc', 'a=1', 'b=2']);
      await fastifyAdapter.close();
    });

    it('should keep a raw set-cookie value when a later reply.header() call adds a cookie', async () => {
      fastifyAdapter.initHttpServer();
      fastifyAdapter.get('/p', (_req, reply) => {
        reply.raw.setHeader('set-cookie', 'session=abc');
        fastifyAdapter.appendHeader(reply, 'set-cookie', 'theme=dark');
        reply.header('set-cookie', 'late=1');
        fastifyAdapter.reply(reply, {});
      });

      await fastifyAdapter.getInstance().ready();
      const res = await fastifyAdapter.inject({ method: 'GET', url: '/p' });

      expect(res.headers['set-cookie']).toEqual([
        'session=abc',
        'theme=dark',
        'late=1',
      ]);
      await fastifyAdapter.close();
    });

    it('should not let a later reply.header() call change the raw set-cookie header', async () => {
      fastifyAdapter.initHttpServer();
      let rawSetCookie: unknown;
      fastifyAdapter.get('/p', (_req, reply) => {
        fastifyAdapter.appendHeader(reply, 'set-cookie', 'a=1');
        reply.header('set-cookie', 'b=2');
        rawSetCookie = reply.raw.getHeader('set-cookie');
        fastifyAdapter.reply(reply, {});
      });

      await fastifyAdapter.getInstance().ready();
      await fastifyAdapter.inject({ method: 'GET', url: '/p' });

      expect(rawSetCookie).toEqual(['a=1']);
      await fastifyAdapter.close();
    });

    it('should return the reply when appending set-cookie', async () => {
      fastifyAdapter.initHttpServer();
      fastifyAdapter.get('/p', (_req, reply) => {
        const returned = fastifyAdapter.appendHeader(
          reply,
          'set-cookie',
          'theme=dark',
        );
        fastifyAdapter.reply(reply, { isReply: returned === reply });
      });

      await fastifyAdapter.getInstance().ready();
      const res = await fastifyAdapter.inject({ method: 'GET', url: '/p' });

      expect(JSON.parse(res.body).isReply).toBe(true);
      await fastifyAdapter.close();
    });

    it('should keep both set-cookie values when the reply is hijacked and written through the raw response', async () => {
      fastifyAdapter.initHttpServer();
      fastifyAdapter.get('/p', (_req, reply) => {
        reply.raw.setHeader('set-cookie', 'session=abc');
        fastifyAdapter.appendHeader(reply, 'Set-Cookie', 'theme=dark');
        reply.hijack();
        reply.raw.end();
      });

      await fastifyAdapter.getInstance().ready();
      const res = await fastifyAdapter.inject({ method: 'GET', url: '/p' });

      expect(res.headers['set-cookie']).toEqual(['session=abc', 'theme=dark']);
      await fastifyAdapter.close();
    });

    it('should not throw when appending set-cookie after the raw headers were sent', async () => {
      fastifyAdapter.initHttpServer();
      fastifyAdapter.get('/p', (_req, reply) => {
        reply.raw.setHeader('set-cookie', 'session=abc');
        reply.hijack();
        reply.raw.writeHead(200);
        fastifyAdapter.appendHeader(reply, 'set-cookie', 'theme=dark');
        reply.raw.end('done');
      });

      await fastifyAdapter.getInstance().ready();
      const res = await fastifyAdapter.inject({ method: 'GET', url: '/p' });

      expect(res.body).toBe('done');
      expect(res.headers['set-cookie']).toBe('session=abc');
      await fastifyAdapter.close();
    });
  });

  describe('header helpers on the raw response', () => {
    it('should set and append a header when given the raw response', async () => {
      fastifyAdapter.initHttpServer();
      fastifyAdapter.get('/p', (_req, reply) => {
        fastifyAdapter.setHeader(reply.raw, 'x-a', '1');
        fastifyAdapter.appendHeader(reply.raw, 'x-a', '2');
        fastifyAdapter.reply(reply, {
          got: fastifyAdapter.getHeader(reply.raw, 'x-a'),
        });
      });

      await fastifyAdapter.getInstance().ready();
      const res = await fastifyAdapter.inject({ method: 'GET', url: '/p' });

      expect(JSON.parse(res.body).got).toEqual(['1', '2']);
      expect(res.headers['x-a']).toEqual(['1', '2']);
      await fastifyAdapter.close();
    });

    it('should append set-cookie values when given the raw response', async () => {
      fastifyAdapter.initHttpServer();
      fastifyAdapter.get('/p', (_req, reply) => {
        fastifyAdapter.appendHeader(reply.raw, 'set-cookie', 'a=1');
        fastifyAdapter.appendHeader(reply.raw, 'set-cookie', 'b=2');
        fastifyAdapter.reply(reply, {});
      });

      await fastifyAdapter.getInstance().ready();
      const res = await fastifyAdapter.inject({ method: 'GET', url: '/p' });

      expect(res.headers['set-cookie']).toEqual(['a=1', 'b=2']);
      await fastifyAdapter.close();
    });

    it('should append to a header that is already an array on the raw response', async () => {
      fastifyAdapter.initHttpServer();
      fastifyAdapter.get('/p', (_req, reply) => {
        reply.raw.setHeader('set-cookie', ['a=1', 'b=2']);
        fastifyAdapter.appendHeader(reply.raw, 'set-cookie', 'c=3');
        fastifyAdapter.reply(reply, {});
      });

      await fastifyAdapter.getInstance().ready();
      const res = await fastifyAdapter.inject({ method: 'GET', url: '/p' });

      expect(res.headers['set-cookie']).toEqual(['a=1', 'b=2', 'c=3']);
      await fastifyAdapter.close();
    });

    it('should append to a number header on the raw response as strings', async () => {
      fastifyAdapter.initHttpServer();
      fastifyAdapter.get('/p', (_req, reply) => {
        reply.raw.setHeader('x-n', 5);
        fastifyAdapter.appendHeader(reply.raw, 'x-n', '6');
        fastifyAdapter.reply(reply, {
          got: fastifyAdapter.getHeader(reply.raw, 'x-n'),
        });
      });

      await fastifyAdapter.getInstance().ready();
      const res = await fastifyAdapter.inject({ method: 'GET', url: '/p' });

      expect(JSON.parse(res.body).got).toEqual(['5', '6']);
      await fastifyAdapter.close();
    });
  });

  describe('getRouteMatchingOptions', () => {
    it.each([
      {
        source: 'the defaults',
        createAdapter: () => new FastifyAdapter(),
        expected: { caseSensitive: true, ignoreTrailingSlash: false },
      },
      {
        source: '"routerOptions"',
        createAdapter: () =>
          new FastifyAdapter({
            routerOptions: { caseSensitive: false, ignoreTrailingSlash: true },
          }),
        expected: { caseSensitive: false, ignoreTrailingSlash: true },
      },
      {
        source: 'the top-level router options',
        createAdapter: () =>
          new FastifyAdapter({
            caseSensitive: false,
            ignoreTrailingSlash: true,
          }),
        expected: { caseSensitive: false, ignoreTrailingSlash: true },
      },
      {
        source: 'an instance created without "routerOptions"',
        createAdapter: () => new FastifyAdapter(fastify()),
        expected: { caseSensitive: true, ignoreTrailingSlash: false },
      },
      {
        source: 'the top-level router options of an instance',
        createAdapter: () =>
          new FastifyAdapter(
            fastify({ caseSensitive: false, ignoreTrailingSlash: true }),
          ),
        expected: { caseSensitive: false, ignoreTrailingSlash: true },
      },
    ])('should follow $source', ({ createAdapter, expected }) => {
      expect(createAdapter().getRouteMatchingOptions()).toEqual(expected);
    });
  });

  describe('createMiddlewareFactory', () => {
    it('should run middleware on an instance created without "routerOptions"', async () => {
      const adapter = new FastifyAdapter(fastify());
      const middleware = vi.fn((_req, _res, next: Function) => next());
      const register = await adapter.createMiddlewareFactory(RequestMethod.ALL);
      register('/cats', middleware);
      adapter.get('/cats', () => 'cats');

      const res = await adapter.inject({ method: 'GET', url: '/cats' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toBe('cats');
      expect(middleware).toHaveBeenCalledOnce();
      await adapter.close();
    });

    // The router decodes the reserved characters of a segment before it
    // matches the text that follows a parameter there, and stores "%" as "%25"
    describe('with a reserved character in the text of the path', () => {
      it.each([
        ['/avatars/:user-avatar@2x.png', '/avatars/alice-avatar@2x.png'],
        ['/avatars/:user-avatar@2x.png', '/avatars/alice-avatar%402x.png'],
        ['/skus/:sku-color=:color', '/skus/42-color%3Dred'],
        ['/discounts/100%', '/discounts/100%25'],
        ['/discounts/:id-100%', '/discounts/5-100%2525'],
      ])(
        'should run the middleware of "%s" for "%s"',
        async (path, requestPath) => {
          const adapter = new FastifyAdapter();
          let urls: { url: string; originalUrl: string } | undefined;
          const middleware = vi.fn((req, _res, next: Function) => {
            urls = { url: req.url, originalUrl: req.originalUrl };
            next();
          });
          const register = await adapter.createMiddlewareFactory(
            RequestMethod.GET,
          );
          register(path, middleware);
          adapter.get(path, () => 'route');

          const url = `${requestPath}?size=2`;
          const res = await adapter.inject({ method: 'GET', url });

          expect(res.body).toBe('route');
          expect(middleware).toHaveBeenCalledOnce();
          expect(urls).toEqual({ url: '/?size=2', originalUrl: url });
          await adapter.close();
        },
      );

      it('should run the middleware on a case-insensitive router', async () => {
        const adapter = new FastifyAdapter({
          routerOptions: { caseSensitive: false },
        });
        const middleware = vi.fn((_req, _res, next: Function) => next());
        const register = await adapter.createMiddlewareFactory(
          RequestMethod.GET,
        );
        register('/Avatars/:user-avatar@2x.png', middleware);
        adapter.get('/Avatars/:user-avatar@2x.png', () => 'route');

        const res = await adapter.inject({
          method: 'GET',
          url: '/AVATARS/alice-avatar%402x.png',
        });

        expect(res.body).toBe('route');
        expect(middleware).toHaveBeenCalledOnce();
        await adapter.close();
      });

      it.each([
        [
          '/avatars/:user-avatar@2x.png',
          '/avatars/:user',
          '/avatars/alice-avatar%403x.png',
        ],
        // The text of a segment without a parameter is compared as it is
        ['/users/@me', '/users/:id', '/users/%40me'],
        ['/users/:id/@me', '/users/:id/:name', '/users/1/%40me'],
      ])(
        'should not run the middleware of "%s" for the route "%s"',
        async (path, routePath, url) => {
          const adapter = new FastifyAdapter();
          const middleware = vi.fn((_req, _res, next: Function) => next());
          const register = await adapter.createMiddlewareFactory(
            RequestMethod.GET,
          );
          register(path, middleware);
          adapter.get(path, () => 'guarded');
          adapter.get(routePath, () => 'route');

          const res = await adapter.inject({ method: 'GET', url });

          expect(res.body).toBe('route');
          expect(middleware).not.toHaveBeenCalled();
          await adapter.close();
        },
      );
    });

    describe('on a case-insensitive router', () => {
      let adapter: FastifyAdapter;
      let urls: { url: string; originalUrl: string };
      const middleware = vi.fn((req, _res, next: Function) => {
        // middie restores "req.url" once the middleware calls "next"
        urls = { url: req.url, originalUrl: req.originalUrl };
        next();
      });

      const setUp = async (
        createAdapter: () => FastifyAdapter,
        path = '/tasks',
      ) => {
        adapter = createAdapter();
        const register = await adapter.createMiddlewareFactory(
          RequestMethod.ALL,
        );
        register(path, middleware);
        adapter.get(path, () => 'tasks');
      };

      afterEach(async () => {
        middleware.mockClear();
        await adapter.close();
      });

      // "%E2%84%AA" (KELVIN SIGN) lower-cases to "k" once decoded, so the
      // router serves "/tas%E2%84%AAs" with the "/tasks" route
      it.each(['/tasks', '/TASKS', '/tas%E2%84%AAs', '/TAS%E2%84%AAS'])(
        'should run the middleware of the route for "%s"',
        async url => {
          await setUp(
            () =>
              new FastifyAdapter({ routerOptions: { caseSensitive: false } }),
          );

          const res = await adapter.inject({ method: 'GET', url });

          expect(res.body).toBe('tasks');
          expect(middleware).toHaveBeenCalledOnce();
        },
      );

      // The router lower-cases the paths of its routes with "toLowerCase()",
      // which the "i" flag of a RegExp does not follow for every letter:
      // "\u0130" lower-cases to "i\u0307", "\u1E9E" to "\u00DF" and "\u212A"
      // (KELVIN SIGN) to "k"
      it.each([
        ['/\u0130adeler', '/%C4%B0adeler'],
        ['/\u0130adeler', '/i%CC%87adeler'],
        ['/stra\u1E9Ee', '/stra%E1%BA%9Ee'],
        ['/stra\u1E9Ee', '/stra%C3%9Fe'],
        ['/tas\u212As', '/tas%E2%84%AAs'],
        ['/tas\u212As', '/tasks'],
        ['/\u0130adeler/:Id', '/i%CC%87adeler/1'],
      ])(
        'should run the middleware of the "%s" route for "%s"',
        async (path, url) => {
          await setUp(
            () =>
              new FastifyAdapter({ routerOptions: { caseSensitive: false } }),
            path,
          );

          const res = await adapter.inject({ method: 'GET', url });

          expect(res.body).toBe('tasks');
          expect(middleware).toHaveBeenCalledOnce();
        },
      );

      it('should not lower-case the path of the middleware on a case-sensitive router', async () => {
        await setUp(() => new FastifyAdapter(), '/\u0130adeler');

        const res = await adapter.inject({
          method: 'GET',
          url: '/%C4%B0adeler',
        });

        expect(res.body).toBe('tasks');
        expect(middleware).toHaveBeenCalledOnce();
      });

      it('should run the middleware of the route with the top-level "caseSensitive" option', async () => {
        await setUp(() => new FastifyAdapter({ caseSensitive: false }));

        const res = await adapter.inject({
          method: 'GET',
          url: '/tas%E2%84%AAs',
        });

        expect(res.body).toBe('tasks');
        expect(middleware).toHaveBeenCalledOnce();
      });

      it.each([
        ['case-sensitive', true],
        ['case-insensitive', false],
      ])(
        'should strip the middleware path from "req.url" on a %s router',
        async (_, caseSensitive) => {
          await setUp(
            () => new FastifyAdapter({ routerOptions: { caseSensitive } }),
          );

          await adapter.inject({ method: 'GET', url: '/tasks?done=true' });

          expect(middleware).toHaveBeenCalledOnce();
          expect(urls).toEqual({
            url: '/?done=true',
            originalUrl: '/tasks?done=true',
          });
        },
      );
    });

    // The proxies of `RouterProxy` reject when the exception layer throws
    // while it answers an error thrown by the middleware
    describe('when the middleware rejects', () => {
      const handler = vi.fn(() => 'cats');

      beforeEach(() => {
        handler.mockClear();
        fastifyAdapter.setErrorHandler((err: Error, _req, reply) =>
          reply.code(500).send(`error handler: ${err.message}`),
        );
      });

      afterEach(async () => {
        await fastifyAdapter.close();
      });

      it('should pass the rejection to the error handler', async () => {
        const register = await fastifyAdapter.createMiddlewareFactory(
          RequestMethod.ALL,
        );
        register('/cats', async () => {
          throw new Error('exception layer failed');
        });
        fastifyAdapter.get('/cats', handler);

        const res = await fastifyAdapter.inject({
          method: 'GET',
          url: '/cats',
        });

        expect(res.statusCode).toBe(500);
        expect(res.body).toBe('error handler: exception layer failed');
        expect(handler).not.toHaveBeenCalled();
      });

      it('should log a rejection that follows a call to "next"', async () => {
        const error = vi
          .spyOn(Logger.prototype, 'error')
          .mockImplementation(() => {});
        let rejection!: Promise<void>;
        const register = await fastifyAdapter.createMiddlewareFactory(
          RequestMethod.ALL,
        );
        register('/cats', (_req: unknown, _res: unknown, next: () => void) => {
          next();
          rejection = Promise.reject(new Error('exception layer failed'));
          return rejection;
        });
        fastifyAdapter.get('/cats', handler);

        const res = await fastifyAdapter.inject({
          method: 'GET',
          url: '/cats',
        });
        await rejection.catch(() => {});

        expect(res.statusCode).toBe(200);
        expect(res.body).toBe('cats');
        expect(error).toHaveBeenCalledOnce();
      });
    });

    // `NestFactory.create()` calls `init()`, which registers middie, and
    // `app.init()` registers Nest middleware once `main.ts` ran. middie gives
    // the context of a plugin registered in between a copy of the middleware
    // of the root, as it was then.
    describe('with a plugin registered with an awaited register() before', () => {
      let adapter: FastifyAdapter;
      let urls: { url: string; originalUrl: string };
      const middleware = vi.fn((req, _res, next: Function) => {
        // middie restores "req.url" once the middleware calls "next"
        urls = { url: req.url, originalUrl: req.originalUrl };
        next();
      });
      const plugin = async (instance: FastifyInstance) => {
        instance.get('/jobs', async () => 'jobs');
        await instance.register(
          async nested => {
            nested.get('/nested', async () => 'nested');
          },
          { prefix: '/nested' },
        );
      };

      beforeEach(() => {
        middleware.mockClear();
        adapter = new FastifyAdapter();
      });

      afterEach(async () => {
        await adapter.close();
      });

      it.each(['/queues/jobs', '/queues/nested/nested'])(
        'should run the middleware on "%s"',
        async url => {
          await adapter.init();
          await adapter.register(plugin, { prefix: '/queues' });
          const register = await adapter.createMiddlewareFactory(
            RequestMethod.ALL,
          );
          register('/queues/{*path}', middleware);

          const res = await adapter.inject({ method: 'GET', url });

          expect(res.statusCode).toBe(200);
          expect(middleware).toHaveBeenCalledOnce();
        },
      );

      it('should only run the middleware for its path, and strip it from "req.url"', async () => {
        await adapter.init();
        await adapter.register(plugin, { prefix: '/queues' });
        const register = await adapter.createMiddlewareFactory(
          RequestMethod.ALL,
        );
        register('/queues/jobs', middleware);

        await adapter.inject({ method: 'GET', url: '/queues/nested/nested' });
        expect(middleware).not.toHaveBeenCalled();

        await adapter.inject({ method: 'GET', url: '/queues/jobs?done=true' });
        expect(middleware).toHaveBeenCalledOnce();
        expect(urls).toEqual({
          url: '/?done=true',
          originalUrl: '/queues/jobs?done=true',
        });
      });

      it('should run the middleware once on a plugin registered without await', async () => {
        await adapter.init();
        adapter.register(plugin, { prefix: '/queues' });
        const register = await adapter.createMiddlewareFactory(
          RequestMethod.ALL,
        );
        register('/queues/{*path}', middleware);

        await adapter.inject({ method: 'GET', url: '/queues/nested/nested' });

        expect(middleware).toHaveBeenCalledOnce();
      });

      // `Test.createNestApplication()` registers middie in `app.init()`
      it('should run the middleware once on a plugin registered before middie', async () => {
        await adapter.register(plugin, { prefix: '/queues' });
        await adapter.init();
        const register = await adapter.createMiddlewareFactory(
          RequestMethod.ALL,
        );
        register('/queues/{*path}', middleware);

        await adapter.inject({ method: 'GET', url: '/queues/nested/nested' });

        expect(middleware).toHaveBeenCalledOnce();
      });

      // The application registers middie itself, in place of `init()`
      describe('and "skipMiddie"', () => {
        beforeEach(async () => {
          await adapter.close();
          adapter = new FastifyAdapter({ skipMiddie: true });
        });

        it.each(['/queues/jobs', '/queues/nested/nested'])(
          'should run the middleware on "%s"',
          async url => {
            await adapter.register(middie);
            await adapter.register(plugin, { prefix: '/queues' });
            const register = await adapter.createMiddlewareFactory(
              RequestMethod.ALL,
            );
            register('/queues/{*path}', middleware);

            const res = await adapter.inject({ method: 'GET', url });

            expect(res.statusCode).toBe(200);
            expect(middleware).toHaveBeenCalledOnce();
          },
        );

        it('should only run the middleware for its path, and strip it from "req.url"', async () => {
          await adapter.register(middie);
          await adapter.register(plugin, { prefix: '/queues' });
          const register = await adapter.createMiddlewareFactory(
            RequestMethod.ALL,
          );
          register('/queues/jobs', middleware);

          await adapter.inject({ method: 'GET', url: '/queues/nested/nested' });
          expect(middleware).not.toHaveBeenCalled();

          await adapter.inject({
            method: 'GET',
            url: '/queues/jobs?done=true',
          });
          expect(middleware).toHaveBeenCalledOnce();
          expect(urls).toEqual({
            url: '/?done=true',
            originalUrl: '/queues/jobs?done=true',
          });
        });

        it('should run the middleware once on a plugin registered without await', async () => {
          await adapter.register(middie);
          adapter.register(plugin, { prefix: '/queues' });
          const register = await adapter.createMiddlewareFactory(
            RequestMethod.ALL,
          );
          register('/queues/{*path}', middleware);

          await adapter.inject({ method: 'GET', url: '/queues/nested/nested' });

          expect(middleware).toHaveBeenCalledOnce();
        });

        it('should run the middleware once on a plugin registered before middie', async () => {
          await adapter.register(plugin, { prefix: '/queues' });
          await adapter.register(middie);
          const register = await adapter.createMiddlewareFactory(
            RequestMethod.ALL,
          );
          register('/queues/{*path}', middleware);

          await adapter.inject({ method: 'GET', url: '/queues/nested/nested' });

          expect(middleware).toHaveBeenCalledOnce();
        });
      });
    });
  });

  describe('empty route parameters', () => {
    beforeEach(() => {
      fastifyAdapter.setNotFoundHandler((_req, reply) =>
        reply.code(404).send('not found'),
      );
    });

    afterEach(async () => {
      await fastifyAdapter.close();
    });

    it.each([
      ['/users/:id/profile', '/users//profile'],
      ['/users/:id', '/users/'],
      ['/ranges/:from-:to', '/ranges/-b'],
      ['/ranges/:from-:to', '/ranges/a-'],
    ])(
      'should pass a request for "%s" with an empty parameter (%s) to the not-found handler',
      async (path, url) => {
        const handler = vi.fn(() => 'found');
        fastifyAdapter.get(path, handler);

        const res = await fastifyAdapter.inject({ method: 'GET', url });

        expect(res.statusCode).toBe(404);
        expect(res.body).toBe('not found');
        expect(handler).not.toHaveBeenCalled();
      },
    );

    it('should call the handler when every route parameter has a value', async () => {
      const handler = vi.fn((req: FastifyRequest) => req.params);
      fastifyAdapter.get('/ranges/:from-:to', handler);

      const res = await fastifyAdapter.inject({
        method: 'GET',
        url: '/ranges/a-b',
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ from: 'a', to: 'b' });
      expect(handler).toHaveBeenCalledOnce();
    });

    // "request.params" holds the last value of a repeated parameter name
    it.each([
      ['/projects/:id/tasks/:id', '/projects//tasks/5'],
      ['/projects/:id/tasks/:id', '/projects/1/tasks/'],
      ['/projects/:id/tasks/:id.json', '/projects//tasks/5.json'],
      ['/ranges/:id-:id', '/ranges/-b'],
      ['/files/:id/:id/*', '/files//b/c'],
    ])(
      'should pass a request for "%s" with an empty value of a repeated parameter name (%s) to the not-found handler',
      async (path, url) => {
        const handler = vi.fn(() => 'found');
        fastifyAdapter.get(path, handler);

        const res = await fastifyAdapter.inject({ method: 'GET', url });

        expect(res.statusCode).toBe(404);
        expect(res.body).toBe('not found');
        expect(handler).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['/projects/:id/tasks/:id', '/projects/1/tasks/5?sort=asc', { id: '5' }],
      ['/ranges/:id-:id', '/ranges/a-b', { id: 'b' }],
      ['/files/:id/:id/*', '/files/a/b/', { id: 'b', '*': '' }],
      ['/files/:id/:id/*', '/files/a/b/c/d', { id: 'b', '*': 'c/d' }],
    ])(
      'should call the handler of "%s" when every value of a repeated parameter name is set (%s)',
      async (path, url, params) => {
        const handler = vi.fn((req: FastifyRequest) => req.params);
        fastifyAdapter.get(path, handler);

        const res = await fastifyAdapter.inject({ method: 'GET', url });

        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body)).toEqual(params);
        expect(handler).toHaveBeenCalledOnce();
      },
    );

    it('should match a route with a repeated parameter name with the options of the router', async () => {
      fastifyAdapter = new FastifyAdapter({
        routerOptions: {
          caseSensitive: false,
          ignoreTrailingSlash: true,
          maxParamLength: 200,
        },
      });
      fastifyAdapter.setNotFoundHandler((_req, reply) =>
        reply.code(404).send('not found'),
      );
      const handler = vi.fn(() => 'found');
      fastifyAdapter.get('/Projects/:id/tasks/:id', handler);

      const res = await fastifyAdapter.inject({
        method: 'GET',
        url: `/PROJECTS/${'a'.repeat(150)}/tasks/5/`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toBe('found');

      const emptyRes = await fastifyAdapter.inject({
        method: 'GET',
        url: '/projects//tasks/5/',
      });
      expect(emptyRes.statusCode).toBe(404);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should pass a request with an empty value of a repeated parameter name to the not-found handler for routes registered with all()', async () => {
      const handler = vi.fn(() => 'found');
      fastifyAdapter.all('/projects/:id/tasks/:id', handler);

      for (const method of ['GET', 'POST'] as const) {
        const res = await fastifyAdapter.inject({
          method,
          url: '/projects//tasks/5',
        });
        expect(res.statusCode).toBe(404);
      }
      expect(handler).not.toHaveBeenCalled();

      const res = await fastifyAdapter.inject({
        method: 'POST',
        url: '/projects/1/tasks/5',
      });
      expect(res.body).toBe('found');
    });

    // find-my-way ends a parameter name at "-", "." or "/" only
    describe('with a parameter name the router reads otherwise', () => {
      let warn: ReturnType<typeof vi.spyOn>;

      beforeEach(() => {
        warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
      });

      it.each([
        ['/geo/:lat,:lng', '/geo/12', '/geo/1,2', 'lat,:lng'],
        ['/pkg/:name@:version', '/pkg/nest12', '/pkg/nest@12', 'name@:version'],
        ['/items/:id~x', '/items/5', '/items/5~x', 'id~x'],
      ])(
        'should only serve the requests "%s" matches as written',
        async (path, missUrl, url, name) => {
          const handler = vi.fn(() => 'found');
          fastifyAdapter.get(path, handler);

          const miss = await fastifyAdapter.inject({
            method: 'GET',
            url: missUrl,
          });
          const res = await fastifyAdapter.inject({ method: 'GET', url });

          expect(miss.statusCode).toBe(404);
          expect(res.statusCode).toBe(200);
          expect(handler).toHaveBeenCalledOnce();
          expect(warn).toHaveBeenCalledOnce();
          expect(warn.mock.calls[0][0]).toContain(`":${name}"`);
        },
      );

      it.each(['/files/:name.:ext', '/ranges/:from-:to', '/a::b/:id'])(
        'should not log anything for "%s"',
        path => {
          fastifyAdapter.get(path, () => 'found');

          expect(warn).not.toHaveBeenCalled();
        },
      );
    });

    // Only paths in the syntax of path-to-regexp can have middleware: no
    // route-bound middleware can be registered for these
    it.each([
      '/projects/:id/tasks/:id?',
      '/projects/:id/tasks/:id(^\\d+$)',
      '/a::b/:id/:id',
    ])(
      'should not register middleware for a path in the syntax of find-my-way only (%s)',
      async path => {
        vi.spyOn(LegacyRouteConverter, 'printError').mockImplementation(
          () => {},
        );
        const register = await fastifyAdapter.createMiddlewareFactory(
          RequestMethod.GET,
        );

        expect(() => register(path, () => {})).toThrow(TypeError);
      },
    );

    it('should call the handler for an empty wildcard', async () => {
      const handler = vi.fn(() => 'found');
      fastifyAdapter.get('/files/*', handler);

      const res = await fastifyAdapter.inject({
        method: 'GET',
        url: '/files/',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toBe('found');
    });

    it('should pass a request with an empty parameter to the not-found handler for versioned routes registered with all()', async () => {
      const handler = vi.fn(() => 'found');
      fastifyAdapter.all(
        '/actions/:id/run',
        fastifyAdapter.applyVersionFilter(handler, '1', {
          type: VersioningType.HEADER,
          header: 'X-API-Version',
        }),
      );
      const headers = { 'x-api-version': '1' };

      for (const method of ['GET', 'POST'] as const) {
        const res = await fastifyAdapter.inject({
          method,
          url: '/actions//run',
          headers,
        });
        expect(res.statusCode).toBe(404);
      }
      expect(handler).not.toHaveBeenCalled();

      const res = await fastifyAdapter.inject({
        method: 'POST',
        url: '/actions/1/run',
        headers,
      });
      expect(res.body).toBe('found');
    });

    it('should pass a request with an empty parameter to the not-found handler for routes registered with all()', async () => {
      const handler = vi.fn(() => 'found');
      fastifyAdapter.all('/actions/:id/run', handler);

      for (const method of ['GET', 'POST'] as const) {
        const res = await fastifyAdapter.inject({
          method,
          url: '/actions//run',
        });
        expect(res.statusCode).toBe(404);
      }
      expect(handler).not.toHaveBeenCalled();

      const res = await fastifyAdapter.inject({
        method: 'POST',
        url: '/actions/1/run',
      });
      expect(res.body).toBe('found');
    });

    it('should keep the name of the route handler', () => {
      const names: string[] = [];
      fastifyAdapter
        .getInstance()
        .addHook('onRoute', route => names.push(route.handler.name));
      const handler = () => 'found';
      Object.defineProperty(handler, 'name', {
        value: 'UsersController.findOne',
      });

      fastifyAdapter.get('/users/:id', handler);

      expect(names).toEqual([
        'UsersController.findOne',
        'UsersController.findOne',
      ]);
    });
  });

  describe('request targets', () => {
    const handler = vi.fn(() => 'found');
    const middleware = vi.fn((_req, _res, next: Function) => next());

    /**
     * "light-my-request" always sends an origin-form request target, so the
     * target is set on the request before it reaches the router.
     */
    const injectRequestTarget = async (method: string, target: string) => {
      const instance = fastifyAdapter.getInstance();
      await instance.ready();
      return inject(
        (req, res) => {
          req.url = target;
          instance.routing(req as any, res as any);
        },
        { method: method as any, url: '/' },
      );
    };

    beforeEach(async () => {
      handler.mockClear();
      middleware.mockClear();
      fastifyAdapter.setNotFoundHandler((_req, reply) =>
        reply.code(404).send('not found'),
      );
      const register = await fastifyAdapter.createMiddlewareFactory(
        RequestMethod.ALL,
      );
      register('/users', middleware);
      fastifyAdapter.get('/users', handler);
      fastifyAdapter.options('/', handler);
    });

    afterEach(async () => {
      await fastifyAdapter.close();
    });

    it.each([
      '/users',
      'http://localhost/users',
      'HTTPS://localhost/users',
      'http://localhost/users?a=/b',
    ])('should run the middleware and the route for "%s"', async target => {
      const res = await injectRequestTarget('GET', target);

      expect(res.statusCode).toBe(200);
      expect(res.body).toBe('found');
      expect(middleware).toHaveBeenCalledOnce();
    });

    it.each(['*users', 'users', '*', 'ftp://localhost/users'])(
      'should pass a request for "%s" to the not-found handler',
      async target => {
        const res = await injectRequestTarget('GET', target);

        expect(res.statusCode).toBe(404);
        expect(res.body).toBe('not found');
        expect(handler).not.toHaveBeenCalled();
        expect(middleware).not.toHaveBeenCalled();
      },
    );

    // "find-my-way" < 9.9.0 routes these as "/users", later versions as "/"
    it.each([
      'http://localhost?a/users',
      'https://localhost??a/users',
      'http://user@localhost?/users',
    ])(
      'should pass a request for "%s", whose query precedes a "/", to the not-found handler',
      async target => {
        fastifyAdapter.get('/', handler);

        const res = await injectRequestTarget('GET', target);

        expect(res.statusCode).toBe(404);
        expect(res.body).toBe('not found');
        expect(handler).not.toHaveBeenCalled();
        expect(middleware).not.toHaveBeenCalled();
      },
    );

    it('should route an absolute-form request target with a query and no path as "/"', async () => {
      fastifyAdapter.get('/', handler);

      const res = await injectRequestTarget('GET', 'http://localhost?a=b');

      expect(res.statusCode).toBe(200);
      expect(res.body).toBe('found');
      expect(middleware).not.toHaveBeenCalled();
    });

    it('should pass "OPTIONS *" to the not-found handler rather than to the "OPTIONS /" route', async () => {
      const res = await injectRequestTarget('OPTIONS', '*');

      expect(res.statusCode).toBe(404);
      expect(res.body).toBe('not found');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should pass a request the router did not match to the not-found handler', async () => {
      const warn = vi.spyOn(fastifyAdapter.getInstance().log, 'warn');

      const res = await injectRequestTarget('GET', '*unknown');

      expect(res.statusCode).toBe(404);
      expect(res.body).toBe('not found');
      expect(warn).not.toHaveBeenCalled();
    });

    it('should set the headers of the security hook on the response', async () => {
      fastifyAdapter.registerSecurityHook((_req, res) => {
        res.setHeader('x-content-type-options', 'nosniff');
        return undefined;
      });

      const res = await injectRequestTarget('GET', '*users');

      expect(res.statusCode).toBe(404);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('requests rejected by the router', () => {
    const securityHook = (_req: unknown, res: any) => {
      res.setHeader('x-security-hook', 'ran');
      return undefined;
    };

    afterEach(async () => {
      await fastifyAdapter.close();
    });

    it.each([
      ['a malformed percent-encoding', '/items/%', 400, 'FST_ERR_BAD_URL'],
      [
        'an over-long parameter',
        `/items/${'a'.repeat(101)}`,
        414,
        'FST_ERR_MAX_PARAM_LENGTH',
      ],
    ])(
      'should run the security hook for a request with %s',
      async (_name, url, statusCode, code) => {
        const handler = vi.fn(() => 'found');
        const hook = vi.fn(securityHook);
        fastifyAdapter.get('/items/:id', handler);
        fastifyAdapter.registerSecurityHook(hook);

        const res = await fastifyAdapter.inject({ method: 'GET', url });

        expect(res.statusCode).toBe(statusCode);
        expect(JSON.parse(res.body)).toMatchObject({ statusCode, code });
        expect(res.headers['x-security-hook']).toBe('ran');
        expect(hook).toHaveBeenCalledOnce();
        expect(handler).not.toHaveBeenCalled();
      },
    );

    it("should send the router's error when the security hook throws", async () => {
      fastifyAdapter.registerSecurityHook((req, res) => {
        securityHook(req, res);
        throw new TypeError('the request has no params');
      });

      const res = await fastifyAdapter.inject({ method: 'POST', url: '/%' });

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body)).toMatchObject({ code: 'FST_ERR_BAD_URL' });
      expect(res.headers['x-security-hook']).toBe('ran');
    });

    it('should keep a "frameworkErrors" option passed to the adapter', async () => {
      const frameworkErrors = vi.fn((_error, _req, reply: FastifyReply) =>
        reply.code(400).send('custom'),
      );
      fastifyAdapter = new FastifyAdapter({ frameworkErrors });
      fastifyAdapter.registerSecurityHook(securityHook);

      const res = await fastifyAdapter.inject({ method: 'GET', url: '/%' });

      expect(res.body).toBe('custom');
      expect(frameworkErrors).toHaveBeenCalledOnce();
    });
  });

  describe('applyVersionFilter', () => {
    const registerVersionNeutralRoute = (
      type: VersioningType.MEDIA_TYPE | VersioningType.HEADER,
    ) => {
      fastifyAdapter.initHttpServer();
      const handler = (_req: FastifyRequest, reply: FastifyReply) =>
        fastifyAdapter.reply(reply, { ok: true }, 200);
      const versioningOptions: VersioningOptions =
        type === VersioningType.MEDIA_TYPE
          ? { type, key: 'v=' }
          : { type, header: 'X-API-Version' };
      const versionedHandler = fastifyAdapter.applyVersionFilter(
        handler,
        [VERSION_NEUTRAL, '2'],
        versioningOptions,
      );
      fastifyAdapter.get('/neutral', versionedHandler);
    };

    afterEach(async () => {
      await fastifyAdapter.close();
    });

    it('should serve a version-neutral route when the accept header carries no version (media type versioning)', async () => {
      registerVersionNeutralRoute(VersioningType.MEDIA_TYPE);
      await fastifyAdapter.getInstance().ready();

      const res = await fastifyAdapter.inject({
        method: 'GET',
        url: '/neutral',
        headers: { accept: 'application/json' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('should serve a version-neutral route when the accept header is absent (media type versioning)', async () => {
      registerVersionNeutralRoute(VersioningType.MEDIA_TYPE);
      await fastifyAdapter.getInstance().ready();

      const res = await fastifyAdapter.inject({
        method: 'GET',
        url: '/neutral',
      });
      expect(res.statusCode).toBe(200);
    });

    it('should serve a version-neutral route when the version header is absent (header versioning)', async () => {
      registerVersionNeutralRoute(VersioningType.HEADER);
      await fastifyAdapter.getInstance().ready();

      const res = await fastifyAdapter.inject({
        method: 'GET',
        url: '/neutral',
      });
      expect(res.statusCode).toBe(200);
    });

    describe('when the extractor of custom versioning throws', () => {
      const handler = vi.fn(() => 'found');
      const middleware = vi.fn((_req, _res, next: Function) => next());

      beforeEach(async () => {
        handler.mockClear();
        middleware.mockClear();
        fastifyAdapter.setErrorHandler((err: Error, _req, reply) =>
          reply.code(500).send(`error handler: ${err.message}`),
        );
        fastifyAdapter.setNotFoundHandler((_req, reply) =>
          reply.code(404).send('not found'),
        );
        const register = await fastifyAdapter.createMiddlewareFactory(
          RequestMethod.ALL,
        );
        register('/{*path}', middleware);
        const extractor = (req: { headers: Record<string, unknown> }) => {
          if (req.headers['x-throw']) {
            throw new Error('extractor failed');
          }
          return '1';
        };
        fastifyAdapter.get(
          '/versioned',
          fastifyAdapter.applyVersionFilter(handler, '1', {
            type: VersioningType.CUSTOM,
            extractor,
          }),
        );
        fastifyAdapter.get(
          '/neutral',
          fastifyAdapter.applyVersionFilter(handler, VERSION_NEUTRAL, {
            type: VersioningType.CUSTOM,
            extractor,
          }),
        );
      });

      it.each(['/versioned', '/neutral', '/unknown'])(
        'should pass the exception to the error handler for "%s"',
        async url => {
          const res = await fastifyAdapter.inject({
            method: 'GET',
            url,
            headers: { 'x-throw': '1' },
          });

          expect(res.statusCode).toBe(500);
          expect(res.body).toBe('error handler: extractor failed');
          expect(handler).not.toHaveBeenCalled();
          expect(middleware).not.toHaveBeenCalled();
        },
      );

      it('should route the next request', async () => {
        await fastifyAdapter.inject({
          method: 'GET',
          url: '/versioned',
          headers: { 'x-throw': '1' },
        });

        const res = await fastifyAdapter.inject({
          method: 'GET',
          url: '/versioned',
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toBe('found');
      });
    });
  });

  describe('all', () => {
    afterEach(async () => {
      await fastifyAdapter.close();
    });

    const registerVersion = (version: string) =>
      fastifyAdapter.all(
        '/all',
        fastifyAdapter.applyVersionFilter(() => `v${version}`, version, {
          type: VersioningType.HEADER,
          header: 'X-API-Version',
        }),
      );
    const send = (method: string, version?: string) =>
      fastifyAdapter.inject({
        method: method as 'GET',
        url: '/all',
        headers: version ? { 'x-api-version': version } : {},
        // Fastify requires a content type for QUERY requests
        ...(method === 'QUERY' && { payload: {} }),
      });

    it('should register the route for every supported method', () => {
      const methods: unknown[] = [];
      fastifyAdapter
        .getInstance()
        .addHook('onRoute', route => methods.push(route.method));

      fastifyAdapter.all('/all', () => 'all');

      expect(methods).toEqual([fastifyAdapter.getInstance().supportedMethods]);
    });

    it('should serve the methods Fastify does not support by default', async () => {
      fastifyAdapter.all('/all', () => 'all');

      for (const method of [
        'SEARCH',
        'PROPFIND',
        'PROPPATCH',
        'MKCOL',
        'COPY',
        'MOVE',
        'LOCK',
        'UNLOCK',
      ]) {
        expect((await send(method)).body).toBe('all');
      }
    });

    it('should serve a method whose first route is registered afterwards', async () => {
      fastifyAdapter.all('/all/*', () => 'all');
      fastifyAdapter.search('/*', () => 'search');

      const search = (url: string) =>
        fastifyAdapter.inject({ method: 'SEARCH' as 'GET', url });
      expect((await search('/all/1')).body).toBe('all');
      expect((await search('/other/1')).body).toBe('search');
    });

    // As when the SEARCH route comes first: an @All() route already serves
    // SEARCH on its path
    it.each([
      ['after', () => fastifyAdapter.all('/dup', () => 'all')],
      ['before', () => fastifyAdapter.search('/dup', () => 'search')],
    ])(
      'should reject a SEARCH route for the path of a route for every method registered %s it',
      (order, registerFirst) => {
        const registerSecond =
          order === 'after'
            ? () => fastifyAdapter.search('/dup', () => 'search')
            : () => fastifyAdapter.all('/dup', () => 'all');

        registerFirst();

        expect(registerSecond).toThrow(
          expect.objectContaining({ code: 'FST_ERR_DUPLICATED_ROUTE' }),
        );
      },
    );

    it('should only route requests for the version of the handler', async () => {
      registerVersion('1');

      for (const method of fastifyAdapter.getInstance().supportedMethods) {
        expect((await send(method, '1')).statusCode).toBe(200);
        expect((await send(method, '2')).statusCode).toBe(404);
        expect((await send(method)).statusCode).toBe(404);
      }
    });

    it('should route each version to its handler', async () => {
      registerVersion('1');
      registerVersion('2');

      expect((await send('POST', '1')).body).toBe('v1');
      expect((await send('POST', '2')).body).toBe('v2');
    });

    it('should apply the route config, constraints and schema', async () => {
      const handler = (req: FastifyRequest) =>
        String((req.routeOptions.config as { output?: string }).output);
      Reflect.defineMetadata(
        FASTIFY_ROUTE_CONFIG_METADATA,
        { output: 'config' },
        handler,
      );
      Reflect.defineMetadata(
        FASTIFY_ROUTE_CONSTRAINTS_METADATA,
        { host: 'allowed.example.com' },
        handler,
      );
      Reflect.defineMetadata(
        FASTIFY_ROUTE_SCHEMA_METADATA,
        {
          querystring: {
            type: 'object',
            properties: { id: { type: 'integer' } },
            required: ['id'],
          },
        },
        handler,
      );
      fastifyAdapter.all('/all', handler);

      const post = (url: string, host: string) =>
        fastifyAdapter.inject({ method: 'POST', url, headers: { host } });
      expect((await post('/all?id=1', 'allowed.example.com')).body).toBe(
        'config',
      );
      expect(
        (await post('/all?id=one', 'allowed.example.com')).statusCode,
      ).toBe(400);
      expect((await post('/all?id=1', 'other.example.com')).statusCode).toBe(
        404,
      );
    });

    it('should keep the route options passed by the caller', async () => {
      fastifyAdapter.all(
        '/options',
        { config: { output: 'config' } },
        (req: FastifyRequest) =>
          String((req.routeOptions.config as { output?: string }).output),
      );
      fastifyAdapter.all('/handler', {
        constraints: { host: 'allowed.example.com' },
        handler: () => 'all',
      });

      const post = (url: string, host = 'allowed.example.com') =>
        fastifyAdapter.inject({ method: 'POST', url, headers: { host } });
      expect((await post('/options')).body).toBe('config');
      expect((await post('/handler')).body).toBe('all');
      expect((await post('/handler', 'other.example.com')).statusCode).toBe(
        404,
      );
    });
  });

  describe('initHttpServer forceCloseConnections', () => {
    it('should close after inject() requests and run the onClose hooks', async () => {
      let onCloseCalled = false;
      fastifyAdapter.initHttpServer({ forceCloseConnections: true });
      fastifyAdapter.get('/', () => 'ok');
      fastifyAdapter.getInstance().addHook('onClose', async () => {
        onCloseCalled = true;
      });

      const res = await fastifyAdapter.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(200);

      await fastifyAdapter.close();
      expect(onCloseCalled).toBe(true);
    });
  });

  describe('initHttpServer return503OnClosing', () => {
    afterEach(async () => {
      await fastifyAdapter.close();
    });

    it('should answer 503 with Connection: close once beforeClose() ran', async () => {
      fastifyAdapter.initHttpServer({ return503OnClosing: true });
      fastifyAdapter.get('/', () => 'ok');

      const before = await fastifyAdapter.inject({ method: 'GET', url: '/' });
      expect(before.statusCode).toBe(200);

      fastifyAdapter.beforeClose();

      const res = await fastifyAdapter.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(503);
      expect(res.headers.connection).toBe('close');
      expect(res.headers['content-type']).toMatch(/^application\/json/);
      // The body Fastify itself sends once `close()` runs
      expect(res.body).toBe(
        '{"error":"Service Unavailable","message":"Service Unavailable","statusCode":503}',
      );
    });

    it('should answer 503 before Nest middleware runs', async () => {
      // `NestFactory.create()` calls `init()`, which registers middie,
      // before the application calls `initHttpServer()`
      await fastifyAdapter.init();
      fastifyAdapter.initHttpServer({ return503OnClosing: true });
      const middleware = vi.fn((_req, _res, next: () => void) => next());
      fastifyAdapter.use(middleware);
      fastifyAdapter.get('/', () => 'ok');

      fastifyAdapter.beforeClose();

      const res = await fastifyAdapter.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(503);
      expect(middleware).not.toHaveBeenCalled();
    });

    it('should keep serving requests after beforeClose() when return503OnClosing is not set', async () => {
      fastifyAdapter.initHttpServer({});
      fastifyAdapter.get('/', () => 'ok');

      fastifyAdapter.beforeClose();

      const res = await fastifyAdapter.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toBe('ok');
    });
  });

  describe('useBodyParser', () => {
    const registerEchoRoute = () =>
      fastifyAdapter.post(
        '/',
        (req: RawBodyRequest<FastifyRequest>, reply: FastifyReply) =>
          fastifyAdapter.reply(reply, {
            body: req.body,
            rawBody: req.rawBody?.toString(),
          }),
      );
    const post = (contentType: string, payload: string) =>
      fastifyAdapter.inject({
        method: 'POST',
        url: '/',
        headers: { 'content-type': contentType },
        payload,
      });

    afterEach(async () => {
      await fastifyAdapter.close();
    });

    it('should keep the default parsers when another content type is registered', async () => {
      fastifyAdapter.useBodyParser('text/plain', true);
      fastifyAdapter.registerParserMiddleware(undefined, true);
      registerEchoRoute();

      const form = await post('application/x-www-form-urlencoded', 'msg=hello');
      expect(form.statusCode).toBe(200);
      expect(JSON.parse(form.body)).toEqual({
        body: { msg: 'hello' },
        rawBody: 'msg=hello',
      });

      const json = await post('application/json', '{"msg":"hello"}');
      expect(JSON.parse(json.body)).toEqual({
        body: { msg: 'hello' },
        rawBody: '{"msg":"hello"}',
      });
    });

    it.each([
      ['application/json', '{"msg":"hello"}'],
      ['application/x-www-form-urlencoded', 'msg=hello'],
      ['Application/JSON', '{"msg":"hello"}'],
    ])(
      'should parse %s with the default parser when no custom parser is given',
      async (contentType, payload) => {
        fastifyAdapter.useBodyParser(contentType, true, {
          bodyLimit: 10_485_760,
        });
        // Would throw FST_ERR_CTP_ALREADY_PRESENT if the defaults were registered again.
        fastifyAdapter.registerParserMiddleware(undefined, true);
        registerEchoRoute();

        const res = await post(contentType, payload);

        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body)).toEqual({
          body: { msg: 'hello' },
          rawBody: payload,
        });
      },
    );

    it.each([
      ['a catch-all', '*'],
      ['a RegExp', /urlencoded/],
    ])(
      'should not replace %s custom parser with the default urlencoded one',
      async (_, type) => {
        fastifyAdapter.useBodyParser(type, true, {}, (_req, body, done) =>
          done(null, `custom:${body.toString()}`),
        );
        fastifyAdapter.registerParserMiddleware(undefined, true);
        registerEchoRoute();

        const res = await post(
          'application/x-www-form-urlencoded',
          'msg=hello',
        );

        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body)).toEqual({
          body: 'custom:msg=hello',
          rawBody: 'msg=hello',
        });
      },
    );

    it('should parse each content type of an array with its default parser', async () => {
      fastifyAdapter.useBodyParser(['application/json', 'text/plain'], true, {
        bodyLimit: 10_485_760,
      });
      fastifyAdapter.registerParserMiddleware(undefined, true);
      registerEchoRoute();

      const json = await post('application/json', '{"msg":"hello"}');
      expect(json.statusCode).toBe(200);
      expect(JSON.parse(json.body)).toEqual({
        body: { msg: 'hello' },
        rawBody: '{"msg":"hello"}',
      });

      const text = await post('text/plain', 'hello');
      expect(text.statusCode).toBe(200);
      expect(JSON.parse(text.body).rawBody).toBe('hello');
    });

    describe('with a "__proto__" key in a urlencoded body', () => {
      const form = 'application/x-www-form-urlencoded';
      const registerKeysRoute = () =>
        fastifyAdapter.post('/', (req: FastifyRequest, reply: FastifyReply) =>
          fastifyAdapter.reply(reply, {
            keys: Object.keys(req.body as object),
          }),
        );

      it.each([
        'msg=hello&__proto__=a',
        'msg=hello&__proto__=a&__proto__=b',
        'msg=hello&%5F_proto__=a',
      ])('should reject "%s" by default, as a JSON body', async payload => {
        fastifyAdapter.registerParserMiddleware();
        registerKeysRoute();

        const res = await post(form, payload);
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body).message).toBe(
          'Object contains forbidden prototype property',
        );

        const json = await post(
          'application/json',
          '{"msg":"hello","__proto__":["a","b"]}',
        );
        expect(json.statusCode).toBe(400);
      });

      it('should accept a key that only contains "__proto__"', async () => {
        fastifyAdapter.registerParserMiddleware();
        registerKeysRoute();

        const res = await post(form, 'msg=hello&__proto__x=a&a__proto__=b');

        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body).keys).toEqual([
          'msg',
          '__proto__x',
          'a__proto__',
        ]);
      });

      it('should remove the key when "onProtoPoisoning" is "remove"', async () => {
        fastifyAdapter = new FastifyAdapter({ onProtoPoisoning: 'remove' });
        fastifyAdapter.registerParserMiddleware();
        registerKeysRoute();

        const res = await post(form, 'msg=hello&__proto__=a&__proto__=b');

        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body).keys).toEqual(['msg']);
      });

      it('should keep the key when "onProtoPoisoning" is "ignore"', async () => {
        fastifyAdapter = new FastifyAdapter({ onProtoPoisoning: 'ignore' });
        fastifyAdapter.registerParserMiddleware();
        registerKeysRoute();

        const res = await post(form, 'msg=hello&__proto__=a&__proto__=b');

        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body).keys).toEqual(['msg', '__proto__']);
      });

      it('should reject the key with the default parser registered through useBodyParser()', async () => {
        fastifyAdapter.useBodyParser(form, false, { bodyLimit: 10_485_760 });
        fastifyAdapter.registerParserMiddleware();
        registerKeysRoute();

        const res = await post(form, '__proto__=a&__proto__=b');

        expect(res.statusCode).toBe(400);
      });
    });

    describe('with a custom parser that returns a promise or throws', () => {
      type Done = (err: Error | null, body?: unknown) => void;
      const parse = (body: Buffer) => {
        if (body.toString() === 'malformed') {
          throw new Error('malformed body');
        }
        return `custom:${body.toString()}`;
      };
      const handler = vi.fn((req: FastifyRequest, reply: FastifyReply) =>
        fastifyAdapter.reply(reply, { body: req.body }),
      );

      beforeEach(() => {
        handler.mockClear();
        fastifyAdapter.setErrorHandler((err: Error, _req, reply) =>
          reply.code(500).send(`error handler: ${err.message}`),
        );
        fastifyAdapter.post('/', handler);
      });

      describe.each([
        [
          'an async parser that calls "done"',
          async (_req: unknown, body: Buffer, done: Done) => {
            await Promise.resolve();
            done(null, parse(body));
          },
        ],
        [
          'an async parser that calls "done" after it resolved',
          async (_req: unknown, body: Buffer, done: Done) => {
            const parsed = parse(await Promise.resolve(body));
            setImmediate(() => done(null, parsed));
          },
        ],
        [
          'a parser that resolves with the body',
          async (_req: unknown, body: Buffer) => {
            await Promise.resolve();
            return parse(body);
          },
        ],
        [
          'a synchronous parser that calls "done"',
          (_req: unknown, body: Buffer, done: Done) => {
            done(null, parse(body));
          },
        ],
      ])('%s', (_, parser) => {
        beforeEach(() => {
          fastifyAdapter.useBodyParser('text/custom', false, {}, parser as any);
        });

        it('should pass the parsed body to the handler once', async () => {
          const res = await post('text/custom', 'hello');
          await new Promise(resolve => setImmediate(resolve));

          expect(res.statusCode).toBe(200);
          expect(JSON.parse(res.body)).toEqual({ body: 'custom:hello' });
          expect(handler).toHaveBeenCalledOnce();
        });

        it('should pass what it throws or rejects with to the error handler', async () => {
          const res = await post('text/custom', 'malformed');

          expect(res.statusCode).toBe(500);
          expect(res.body).toBe('error handler: malformed body');
          expect(handler).not.toHaveBeenCalled();
        });
      });

      it('should log a rejection that follows a call to "done"', async () => {
        const error = vi
          .spyOn(Logger.prototype, 'error')
          .mockImplementation(() => {});
        let rejection!: Promise<void>;
        fastifyAdapter.useBodyParser(
          'text/custom',
          false,
          {},
          (_req, body, done) => {
            done(null, parse(body));
            rejection = Promise.reject(new Error('parser failed'));
            return rejection;
          },
        );

        const res = await post('text/custom', 'hello');
        await rejection.catch(() => {});

        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body)).toEqual({ body: 'custom:hello' });
        expect(handler).toHaveBeenCalledOnce();
        expect(error).toHaveBeenCalledOnce();
      });
    });
  });

  describe('use', () => {
    let adapter: FastifyAdapter;
    const handler = vi.fn(() => 'ok');

    beforeEach(() => {
      handler.mockClear();
      adapter = new FastifyAdapter();
      adapter.setErrorHandler((err: Error, _req, reply) =>
        reply.code(500).send(`error handler: ${err.message}`),
      );
    });

    afterEach(async () => {
      await adapter.close();
    });

    const rejecting = async () => {
      await Promise.resolve();
      throw new Error('rejected');
    };
    const get = (url = '/a') => adapter.inject({ method: 'GET', url });

    it('should pass the rejection of an async middleware to the error handler', async () => {
      await adapter.init();
      adapter.use(rejecting);
      adapter.get('/a', handler);

      const res = await get();

      expect(res.statusCode).toBe(500);
      expect(res.body).toBe('error handler: rejected');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should pass the rejection of a middleware queued before init to the error handler', async () => {
      adapter.use(rejecting);
      await adapter.init();
      adapter.get('/a', handler);

      const res = await get();

      expect(res.body).toBe('error handler: rejected');
    });

    it('should pass what a middleware throws after an earlier one called "next" asynchronously to the error handler', async () => {
      await adapter.init();
      adapter.use(async (_req: unknown, _res: unknown, next: () => void) => {
        await Promise.resolve();
        next();
      });
      adapter.use(() => {
        throw new Error('thrown');
      });
      adapter.get('/a', handler);

      const res = await get();

      expect(res.body).toBe('error handler: thrown');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should run the middleware of a path, and of a list, in the same way', async () => {
      await adapter.init();
      const calls: string[] = [];
      adapter.use('/a', (_req: unknown, _res: unknown, next: () => void) => {
        calls.push('path');
        next();
      });
      adapter.use([
        (_req: unknown, _res: unknown, next: () => void) => {
          calls.push('list');
          next();
        },
      ]);
      adapter.use('/b', [rejecting]);
      adapter.get('/a', handler);
      adapter.get('/b', handler);

      const a = await get('/a');
      const b = await get('/b');

      expect(a.body).toBe('ok');
      expect(b.body).toBe('error handler: rejected');
      expect(calls).toEqual(['path', 'list', 'list']);
    });

    it('should hand a function with more than three parameters to "use()" as it is', async () => {
      await adapter.close();
      adapter = new FastifyAdapter({ skipMiddie: true });
      await adapter.register(middie);
      const use = vi.spyOn(adapter.getInstance() as any, 'use');
      const errorHandler = (
        _err: unknown,
        _req: unknown,
        _res: unknown,
        next: () => void,
      ) => next();

      adapter.use(errorHandler);

      expect(use).toHaveBeenCalledWith(errorHandler);
    });
  });

  describe('listen', () => {
    const socketPath = '/run/app.sock';
    const namedPipe = String.raw`\\.\pipe\app`;

    const spyOnListen = () =>
      vi
        .spyOn(fastifyAdapter.getInstance(), 'listen')
        .mockResolvedValue('listening');

    it.each([70000, -1, 1.5, '70000', { port: 65536 }])(
      'should throw instead of listening on the invalid port %j',
      port => {
        const listen = spyOnListen();

        expect(() => fastifyAdapter.listen(port as any)).toThrow(
          expect.objectContaining({
            name: 'RangeError',
            code: 'ERR_SOCKET_BAD_PORT',
          }),
        );
        expect(listen).not.toHaveBeenCalled();
      },
    );

    it.each([0, 3000, '3000', { port: 65535 }, { host: 'localhost' }])(
      'should listen on the valid port %j',
      port => {
        const listen = spyOnListen();

        fastifyAdapter.listen(port as any);

        expect(listen).toHaveBeenCalledOnce();
      },
    );

    it('should listen on a string that is not a number as a path', () => {
      const listen = spyOnListen();

      fastifyAdapter.listen(socketPath);

      expect(listen).toHaveBeenCalledWith({ path: socketPath }, undefined);
    });

    it('should listen on a string that only starts with a number as a path', () => {
      const listen = spyOnListen();

      fastifyAdapter.listen('3000abc');

      expect(listen).toHaveBeenCalledWith({ path: '3000abc' }, undefined);
    });

    it('should listen on a named pipe as a path', () => {
      const listen = spyOnListen();

      fastifyAdapter.listen(namedPipe);

      expect(listen).toHaveBeenCalledWith({ path: namedPipe }, undefined);
    });

    it('should not set the host when it listens on a path', () => {
      const listen = spyOnListen();

      fastifyAdapter.listen(socketPath, '127.0.0.1');

      expect(listen).toHaveBeenCalledWith({ path: socketPath }, undefined);
    });

    it('should pass the callback when it listens on a path', () => {
      const listen = spyOnListen();
      const callback = vi.fn();

      fastifyAdapter.listen(socketPath, callback);

      expect(listen).toHaveBeenCalledWith({ path: socketPath }, callback);
    });

    it('should keep a numeric string as a port', () => {
      const listen = spyOnListen();

      fastifyAdapter.listen('3000', '127.0.0.1');

      expect(listen).toHaveBeenCalledWith(
        { port: 3000, host: '127.0.0.1' },
        undefined,
      );
    });

    it('should keep the options object as it is', () => {
      const listen = spyOnListen();

      fastifyAdapter.listen({ port: 3000 });

      expect(listen).toHaveBeenCalledWith({ port: 3000 }, undefined);
    });

    it('should keep an options object with a file descriptor as it is', () => {
      const listen = spyOnListen();
      const callback = vi.fn();

      fastifyAdapter.listen({ fd: 3 }, callback);

      expect(listen).toHaveBeenCalledWith({ fd: 3 }, callback);
    });

    it('should keep a number as a port', () => {
      const listen = spyOnListen();

      fastifyAdapter.listen(3000, '127.0.0.1');

      expect(listen).toHaveBeenCalledWith(
        { port: 3000, host: '127.0.0.1' },
        undefined,
      );
    });
  });

  describe('useStaticAssets / setViewEngine', () => {
    // `NestApplication` discards what these return, so the plugin has to reach
    // fastify before the caller's next statement — which in the documented
    // bootstrap is `listen()`.
    it('should register @fastify/static before returning', () => {
      const register = vi.spyOn(fastifyAdapter.getInstance(), 'register');

      fastifyAdapter.useStaticAssets({ root: import.meta.dirname });

      expect(register).toHaveBeenCalledOnce();
    });

    it('should register @fastify/view before returning', () => {
      const register = vi.spyOn(fastifyAdapter.getInstance(), 'register');

      fastifyAdapter.setViewEngine({ engine: { handlebars: {} } });

      expect(register).toHaveBeenCalledOnce();
    });
  });
});
