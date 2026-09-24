import { FastifyAdapter } from '../../adapters/fastify-adapter';
import { createError } from '@fastify/error';
import {
  HttpException,
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
