import {
  BadRequestException,
  RequestMethod,
  StreamableFile,
} from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { PassThrough } from 'stream';

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
    it('should mount each excluded path for every request method', () => {
      const instance = expressAdapter.getInstance();
      const allSpy = vi.spyOn(instance, 'all');
      const useSpy = vi.spyOn(instance, 'use');
      const handler = vi.fn();

      expressAdapter.setNotFoundHandler(handler, 'api', [
        { path: '/v1/hello', method: RequestMethod.GET },
        { path: 'v2/hello/:id', method: RequestMethod.POST },
      ]);

      expect(useSpy).toHaveBeenCalledExactlyOnceWith(
        '/api',
        expect.any(Function),
      );
      expect(allSpy.mock.calls).toEqual([
        ['/v1/hello', handler],
        ['/v2/hello/:id', handler],
      ]);
    });

    it('should not mount excluded paths separately without a global prefix', () => {
      const allSpy = vi.spyOn(expressAdapter.getInstance(), 'all');
      expressAdapter.setNotFoundHandler(vi.fn(), undefined, [
        { path: '/hello', method: RequestMethod.GET },
      ]);
      expect(allSpy).not.toHaveBeenCalled();
    });

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

  describe('createMiddlewareFactory', () => {
    // Plain-path routes such as forRoutes('*') carry no request method
    // (see RoutesMapper.getRouteInfoFromPath).
    const NO_REQUEST_METHOD = -1 as RequestMethod;

    it.each([
      {
        method: NO_REQUEST_METHOD,
        path: '/api$',
        expressMethod: 'all',
        registeredPath: '/api',
      },
      {
        method: NO_REQUEST_METHOD,
        path: '/api/v1$',
        expressMethod: 'all',
        registeredPath: '/api/v1',
      },
      {
        method: RequestMethod.GET,
        path: '/api$',
        expressMethod: 'get',
        registeredPath: '/api',
      },
    ] as const)(
      'should register the exact-match path $path through "$expressMethod" at $registeredPath',
      ({ method, path, expressMethod, registeredPath }) => {
        const expressInstance = expressAdapter.getInstance();
        const routeSpy = vi.spyOn(expressInstance, expressMethod);
        const useSpy = vi.spyOn(expressInstance, 'use');
        const handler = vi.fn();

        expressAdapter.createMiddlewareFactory(method)(path, handler);

        expect(routeSpy).toHaveBeenCalledExactlyOnceWith(
          registeredPath,
          expect.any(Function),
        );
        expect(useSpy).not.toHaveBeenCalled();
      },
    );

    it('should leave "/api/" of the exact-match path to the wildcard entry', () => {
      const allSpy = vi.spyOn(expressAdapter.getInstance(), 'all');
      const middleware = vi.fn();
      const next = vi.fn();

      expressAdapter.createMiddlewareFactory(NO_REQUEST_METHOD)(
        '/api$',
        middleware,
      );
      const [, handler] = allSpy.mock.calls[0] as unknown as [string, Function];

      handler({ path: '/api/' }, {}, next);
      expect(middleware).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledOnce();

      const req = { path: '/api' };
      handler(req, {}, next);
      expect(middleware).toHaveBeenCalledExactlyOnceWith(req, {}, next);
    });
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
      'application/json; charset=utf-8',
      'application/problem+json',
      'application/vnd.api+json; charset=utf-8',
      'Application/JSON',
    ])('should keep the "%s" JSON content type for error bodies', type => {
      const response = createResponse();
      response.getHeader.mockReturnValue(type);
      const warnSpy = vi
        .spyOn((expressAdapter as any).logger, 'warn')
        .mockImplementation(() => {});

      expressAdapter.reply(response, { statusCode: 400, message: 'Oops' }, 400);

      expect(response.setHeader).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(response.json).toHaveBeenCalled();
    });

    it('should force a JSON content type for error bodies sent with a non-JSON content type', () => {
      const response = createResponse();
      response.getHeader.mockReturnValue('text/html');

      expressAdapter.reply(response, { statusCode: 400, message: 'Oops' }, 400);

      expect(response.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/json',
      );
    });

    describe('when the body is a StreamableFile', () => {
      const createStreamResponse = () =>
        Object.assign(new PassThrough(), {
          getHeader: vi.fn(),
          setHeader: vi.fn(),
        });

      it('should destroy the source stream when the client disconnects', async () => {
        const source = new PassThrough();
        const errorHandler = vi.fn();
        const errorLogger = vi.fn();
        const file = new StreamableFile(source)
          .setErrorHandler(errorHandler)
          .setErrorLogger(errorLogger);
        const response = createStreamResponse();

        expressAdapter.reply(response, file);
        source.write('partial');
        response.destroy();

        await vi.waitFor(() => expect(source.destroyed).toBe(true));
        expect(errorHandler).not.toHaveBeenCalled();
        expect(errorLogger).not.toHaveBeenCalled();
      });

      it('should destroy the source stream when the client disconnected before the reply', async () => {
        const source = new PassThrough();
        const response = createStreamResponse();
        response.destroy();
        await new Promise(resolve => setImmediate(resolve));

        expressAdapter.reply(response, new StreamableFile(source));

        await vi.waitFor(() => expect(source.destroyed).toBe(true));
      });

      it('should not destroy a source that has ended', async () => {
        const source = new PassThrough({ autoDestroy: false });
        const response = createStreamResponse();
        response.resume();

        expressAdapter.reply(response, new StreamableFile(source));
        source.end('done');
        await new Promise(resolve => response.once('end', resolve));
        await new Promise(resolve => setImmediate(resolve));

        expect(source.readableEnded).toBe(true);
        expect(source.destroyed).toBe(false);
      });

      it('should keep the source open while the response is being written', async () => {
        const source = new PassThrough();
        const response = createStreamResponse();
        const chunks: Buffer[] = [];
        response.on('data', chunk => chunks.push(chunk));

        expressAdapter.reply(response, new StreamableFile(source));
        source.write('first');
        await new Promise(resolve => setImmediate(resolve));

        expect(source.destroyed).toBe(false);
        source.end('second');
        await new Promise(resolve => response.once('end', resolve));
        expect(Buffer.concat(chunks).toString()).toBe('firstsecond');
      });
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
