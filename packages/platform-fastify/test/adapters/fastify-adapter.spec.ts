import { FastifyAdapter } from '../../adapters/fastify-adapter';
import { createError } from '@fastify/error';
import {
  HttpException,
  VERSION_NEUTRAL,
  VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import http from 'node:http';

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
    it('should destroy tracked sockets on close when the Nest option is set', async () => {
      fastifyAdapter.initHttpServer({ forceCloseConnections: true });
      const socket = {
        destroy: vi.fn(),
        on: vi.fn(),
      };
      fastifyAdapter.getHttpServer().emit('connection', socket);

      await fastifyAdapter.close();

      expect(socket.destroy).toHaveBeenCalled();
    });

    it('should not destroy sockets on close when the Nest option is omitted', async () => {
      fastifyAdapter.initHttpServer();
      const socket = {
        destroy: vi.fn(),
        on: vi.fn(),
      };
      fastifyAdapter.getHttpServer().emit('connection', socket);

      await fastifyAdapter.close();

      expect(socket.destroy).not.toHaveBeenCalled();
    });

    it('should let close() finish while a request is in flight', async () => {
      fastifyAdapter.initHttpServer({ forceCloseConnections: true });
      fastifyAdapter.get('/hold', () => new Promise(() => {}));

      await new Promise<void>((resolve, reject) => {
        fastifyAdapter.listen(0, '127.0.0.1', (err?: Error) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      const address = fastifyAdapter.getHttpServer().address();
      const port = typeof address === 'object' && address ? address.port : 0;
      http
        .get({ hostname: '127.0.0.1', port, path: '/hold' })
        .on('error', () => {});
      await new Promise(resolve => setTimeout(resolve, 100));

      const winner = await Promise.race([
        fastifyAdapter.close().then(() => 'settled' as const),
        new Promise<'hung'>(resolve => setTimeout(() => resolve('hung'), 1500)),
      ]);

      expect(winner).toBe('settled');
    });

    it('should destroy in-flight sockets on every Fastify bind address', async () => {
      let hits = 0;
      fastifyAdapter.initHttpServer({ forceCloseConnections: true });
      fastifyAdapter.get('/hold', () => {
        hits += 1;
        return new Promise(() => {});
      });

      await new Promise<void>((resolve, reject) => {
        fastifyAdapter.listen(0, (err?: Error) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      const addresses = fastifyAdapter.getInstance().addresses();
      expect(addresses.length).toBeGreaterThan(0);

      const sockets: http.IncomingMessage['socket'][] = [];
      await Promise.all(
        addresses.map(
          addr =>
            new Promise<void>((resolve, reject) => {
              const req = http.get(
                {
                  hostname: addr.address,
                  port: addr.port,
                  path: '/hold',
                  family: addr.family === 'IPv6' ? 6 : 4,
                },
                () => {},
              );
              req.on('socket', socket => {
                sockets.push(socket);
                resolve();
              });
              req.on('error', err => {
                if (sockets.length === 0) {
                  reject(err);
                } else {
                  resolve();
                }
              });
            }),
        ),
      );

      for (let i = 0; i < 50 && hits < addresses.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      expect(hits).toBe(addresses.length);

      await fastifyAdapter.close();

      await Promise.all(
        sockets.map(socket =>
          socket.destroyed
            ? Promise.resolve()
            : new Promise<void>((resolve, reject) => {
                const timer = setTimeout(
                  () => reject(new Error('socket was not destroyed')),
                  1500,
                );
                socket.once('close', () => {
                  clearTimeout(timer);
                  resolve();
                });
              }),
        ),
      );
      for (const socket of sockets) {
        expect(socket.destroyed).toBe(true);
      }
    });
  });
});
