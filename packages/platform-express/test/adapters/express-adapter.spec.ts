import { BadRequestException } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

describe('ExpressAdapter', () => {
  afterEach(() => vi.restoreAllMocks());
  let expressAdapter: ExpressAdapter;

  beforeEach(() => {
    expressAdapter = new ExpressAdapter();
  });

  describe('setErrorHandler', () => {
    it.each([
      { prefix: 'api', path: '/api' },
      { prefix: '/api', path: '/api' },
      { prefix: 'api/', path: '/api' },
      { prefix: '/api/', path: '/api' },
      { prefix: 'api/v1/', path: '/api/v1' },
    ])(
      'should mount the error handler at $path and the root for prefix $prefix',
      ({ prefix, path }) => {
        const expressInstance = expressAdapter.getInstance();
        const useSpy = vi.spyOn(expressInstance, 'use');
        const handler = vi.fn();

        expressAdapter.setErrorHandler(handler, prefix);

        expect(useSpy).toHaveBeenCalledTimes(2);
        expect(useSpy).toHaveBeenCalledWith(path, expect.any(Function));
        expect(useSpy).toHaveBeenCalledWith(handler);
      },
    );

    it.each([undefined, '', '/'])(
      'should mount only the root error handler for prefix %j',
      prefix => {
        const useSpy = vi.spyOn(expressAdapter.getInstance(), 'use');
        const handler = vi.fn();

        expressAdapter.setErrorHandler(handler, prefix);

        expect(useSpy).toHaveBeenCalledExactlyOnceWith(handler);
      },
    );
  });

  describe('setNotFoundHandler', () => {
    it.each([
      { prefix: 'api', path: '/api' },
      { prefix: '/api', path: '/api' },
      { prefix: 'api/', path: '/api' },
      { prefix: '/api/', path: '/api' },
      { prefix: 'api/v1/', path: '/api/v1' },
    ])(
      'should mount the not-found handler at $path for prefix $prefix',
      ({ prefix, path }) => {
        const expressInstance = expressAdapter.getInstance();
        const useSpy = vi.spyOn(expressInstance, 'use');

        expressAdapter.setNotFoundHandler(vi.fn(), prefix);

        expect(useSpy).toHaveBeenCalledExactlyOnceWith(
          path,
          expect.any(Function),
        );
      },
    );

    it.each([undefined, '', '/'])(
      'should mount only the root not-found handler for prefix %j',
      prefix => {
        const useSpy = vi.spyOn(expressAdapter.getInstance(), 'use');

        expressAdapter.setNotFoundHandler(vi.fn(), prefix);

        expect(useSpy).toHaveBeenCalledExactlyOnceWith(expect.any(Function));
      },
    );
  });

  describe('registerParserMiddleware', () => {
    it('should register the express built-in parsers for json and urlencoded payloads', () => {
      const expressInstance = express();
      const jsonParserInstance = express.json();
      const urlencodedInstance = express.urlencoded();
      const jsonParserSpy = vi
        .spyOn(express, 'json')
        .mockReturnValue(jsonParserInstance as any);
      const urlencodedParserSpy = vi
        .spyOn(express, 'urlencoded')
        .mockReturnValue(urlencodedInstance as any);
      const useSpy = vi.spyOn(expressInstance, 'use');
      const expressAdapter = new ExpressAdapter(expressInstance);
      useSpy.mockClear();

      expressAdapter.registerParserMiddleware();

      expect(useSpy).toHaveBeenCalledTimes(2);
      expect(useSpy).toHaveBeenCalledWith(jsonParserInstance);
      expect(useSpy).toHaveBeenCalledWith(urlencodedInstance);
      expect(jsonParserSpy).toHaveBeenCalledWith({});
      expect(urlencodedParserSpy).toHaveBeenCalledWith({ extended: true });
    });

    it('should not register default parsers if custom parsers have already been registered', () => {
      const expressInstance = express();
      expressInstance.use(function jsonParser() {});
      expressInstance.use(function urlencodedParser() {});
      const useSpy = vi.spyOn(expressInstance, 'use');
      const expressAdapter = new ExpressAdapter(expressInstance);
      useSpy.mockClear();

      expressAdapter.registerParserMiddleware();

      expect(useSpy).not.toHaveBeenCalled();
    });
  });

  describe('reply', () => {
    const createResponse = () => ({
      status: vi.fn(),
      send: vi.fn(),
      json: vi.fn(),
      getHeader: vi.fn(),
      setHeader: vi.fn(),
    });

    it('should apply the given status code', () => {
      const response = createResponse();

      expressAdapter.reply(response, { message: 'Oops' }, 404);

      expect(response.status).toHaveBeenCalledWith(404);
    });

    it('should not apply any status code when it is omitted', () => {
      const response = createResponse();

      expressAdapter.reply(response, { message: 'Hello' });

      expect(response.status).not.toHaveBeenCalled();
    });

    it('should apply falsy status codes instead of dropping them', () => {
      // "0" and "NaN" are falsy, but they were still passed in. Forwarding them
      // lets express reject the value, whereas skipping the call leaves the
      // status that was set before the handler ran (200/201), so an error would
      // be sent with a successful status code.
      for (const statusCode of [0, NaN]) {
        const response = createResponse();

        expressAdapter.reply(response, { message: 'Oops' }, statusCode);

        expect(response.status).toHaveBeenCalledWith(statusCode);
      }
    });

    it.each([
      ['a Buffer', Buffer.from('hello')],
      ['a Uint8Array', new Uint8Array([104, 101, 108, 108, 111])],
      ['a DataView', new DataView(new Uint8Array([104, 101]).buffer)],
    ])('should send %s as-is instead of serializing it to JSON', (_, body) => {
      const response = createResponse();

      expressAdapter.reply(response, body);

      expect(response.send).toHaveBeenCalledWith(body);
      expect(response.json).not.toHaveBeenCalled();
    });

    it('should still send a raw ArrayBuffer as JSON, the way express does', () => {
      const response = createResponse();
      const body = new Uint8Array([104, 101]).buffer;

      expressAdapter.reply(response, body);

      expect(response.json).toHaveBeenCalledWith(body);
      expect(response.send).not.toHaveBeenCalled();
    });
  });

  describe('mapException', () => {
    it('should map URIError with status code to BadRequestException', () => {
      const error = new URIError();
      const result = expressAdapter.mapException(error) as BadRequestException;
      expect(result).toBeInstanceOf(BadRequestException);
    });

    it('should map SyntaxError with status code to BadRequestException', () => {
      const error = new SyntaxError();
      const result = expressAdapter.mapException(error) as BadRequestException;
      expect(result).toBeInstanceOf(BadRequestException);
    });

    it('should return error if it is not handler Error', () => {
      const error = new Error('Test error');
      const result = expressAdapter.mapException(error);
      expect(result).toBe(error);
    });
  });
});
