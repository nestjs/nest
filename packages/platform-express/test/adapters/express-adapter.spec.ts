import { BadRequestException, RequestMethod } from '@nestjs/common';
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

    it('should mount the handler on every excluded path, for every method', () => {
      // An excluded path lives at the root, so the prefix router never sees a
      // request for it. `all`, not the method the exclusion names: the methods
      // it leaves out are the misses this answers.
      const expressInstance = expressAdapter.getInstance();
      const allSpy = vi.spyOn(expressInstance, 'all');
      const handler = vi.fn();

      expressAdapter.setNotFoundHandler(handler, 'api', [
        { path: 'hello', method: RequestMethod.GET },
        { path: '/health/{*splat}', method: RequestMethod.ALL },
      ]);

      expect(allSpy).toHaveBeenCalledTimes(2);
      expect(allSpy).toHaveBeenCalledWith('/hello', handler);
      expect(allSpy).toHaveBeenCalledWith('/health/{*splat}', handler);
    });

    it('should mount nothing extra when nothing is excluded', () => {
      const expressInstance = expressAdapter.getInstance();
      const allSpy = vi.spyOn(expressInstance, 'all');

      expressAdapter.setNotFoundHandler(vi.fn(), 'api', []);

      expect(allSpy).not.toHaveBeenCalled();
    });

    it('should ignore excluded paths when there is no prefix', () => {
      // Without a prefix the root handler already covers them, so a second
      // mount would only add a route that can never be reached first.
      const expressInstance = expressAdapter.getInstance();
      const allSpy = vi.spyOn(expressInstance, 'all');

      expressAdapter.setNotFoundHandler(vi.fn(), undefined, [
        { path: 'hello', method: RequestMethod.GET },
      ]);

      expect(allSpy).not.toHaveBeenCalled();
    });
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
