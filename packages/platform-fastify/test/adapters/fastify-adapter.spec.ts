import { FastifyAdapter } from '../../adapters/fastify-adapter';
import { createError } from '@fastify/error';
import { HttpException } from '@nestjs/common';

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
});
