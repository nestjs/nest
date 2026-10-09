import { FastifyAdapter } from '../../adapters/fastify-adapter';
import { createError } from '@fastify/error';
import {
  HttpException,
  Logger,
  RawBodyRequest,
  VERSION_NEUTRAL,
  VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

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
    });

    it('should return FastifyError without user status code to Internal Server Error HttpException', () => {
      const FastifyErrorCls = createError(
        'FST_WITHOUT_STATUS_CODE',
        'Error without status code',
      );
      const error = new FastifyErrorCls();

      const result = fastifyAdapter.mapException(error) as HttpException;
      expect(result).toBeInstanceOf(HttpException);
      expect(result.message).toBe(error.message);
      expect(result.getStatus()).toBe(500);
    });

    it('should return error if it is not FastifyError', () => {
      const error = new Error('Test error');
      const result = fastifyAdapter.mapException(error);
      expect(result).toBe(error);
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
