import { Socket } from 'net';
import { NodeRequest, NodeResponse } from '../../adapters/node-request.js';
import { NodeRouter } from '../../router/node-router.js';

type Next = (err?: any) => void;

function createRequest(method: string, url: string) {
  const req = new NodeRequest(new Socket());
  req.method = method;
  req.url = url;
  return req;
}

describe('NodeRouter', () => {
  let finalHandler: ReturnType<typeof vi.fn>;
  let router: NodeRouter;

  beforeEach(() => {
    finalHandler = vi.fn();
    router = new NodeRouter(finalHandler);
  });

  // Handlers that do not wait for anything run before router() returns
  function dispatch(method: string, url: string) {
    const req = createRequest(method, url);
    const res = new NodeResponse(req);
    router(req, res);
    return { req, res };
  }

  it('should be a request listener', () => {
    const handler = vi.fn();
    router.get('/', handler);

    expect(typeof router).toBe('function');
    expect(router).toBeInstanceOf(NodeRouter);
    router.call(undefined, createRequest('GET', '/'), {} as any);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should turn plain Node.js requests and responses into NodeRequest and NodeResponse', () => {
    let received: [unknown, unknown] | undefined;
    router.use((req: unknown, res: unknown) => {
      received = [req, res];
    });
    const req = Object.assign(Object.create(null), { method: 'GET', url: '/' });
    const res = Object.create(null);

    router(req, res);

    expect(received![0]).toBeInstanceOf(NodeRequest);
    expect(received![1]).toBeInstanceOf(NodeResponse);
  });

  describe('stack order', () => {
    it('should run middleware and routes in registration order', () => {
      const calls: string[] = [];
      router.use((_req: unknown, _res: unknown, next: Next) => {
        calls.push('before');
        next();
      });
      router.get('/a', (_req: unknown, _res: unknown, next: Next) => {
        calls.push('route');
        next();
      });
      router.use((_req: unknown, _res: unknown, next: Next) => {
        calls.push('after');
        next();
      });

      dispatch('GET', '/a');
      dispatch('GET', '/b');

      expect(calls).toEqual(['before', 'route', 'after', 'before', 'after']);
      expect(finalHandler).toHaveBeenCalledTimes(2);
      expect(finalHandler.mock.calls[0][0]).toBeUndefined();
    });

    it('should not call the following layers when a handler does not call next()', () => {
      const after = vi.fn();
      router.get('/a', () => {});
      router.use(after);

      dispatch('GET', '/a');

      expect(after).not.toHaveBeenCalled();
      expect(finalHandler).not.toHaveBeenCalled();
    });

    it('should run every handler of a route through next()', () => {
      const calls: string[] = [];
      router.get(
        '/a',
        (_req: unknown, _res: unknown, next: Next) => {
          calls.push('first');
          next();
        },
        () => calls.push('second'),
      );

      dispatch('GET', '/a');

      expect(calls).toEqual(['first', 'second']);
    });

    it('should call `done` instead of the final handler when given', () => {
      const done = vi.fn();
      const req = createRequest('GET', '/missing');

      router(req, new NodeResponse(req), done);

      expect(done).toHaveBeenCalledExactlyOnceWith(undefined);
      expect(finalHandler).not.toHaveBeenCalled();
    });
  });

  describe('routes', () => {
    it('should set the route parameters on the request', () => {
      let params: unknown;
      router.get('/users/:id', (req: NodeRequest) => {
        params = req.params;
      });

      dispatch('GET', '/users/42?x=1');

      expect(params).toEqual({ id: '42' });
    });

    it('should only run routes registered for the request method', () => {
      const post = vi.fn();
      router.post('/users', post);

      dispatch('GET', '/users');

      expect(post).not.toHaveBeenCalled();
      expect(finalHandler).toHaveBeenCalledTimes(1);
    });

    it('should run GET routes for HEAD requests', () => {
      const get = vi.fn();
      router.get('/users', get);

      dispatch('HEAD', '/users');

      expect(get).toHaveBeenCalledTimes(1);
    });

    it('should run routes registered with all() for every method', () => {
      const all = vi.fn();
      router.all('/users', all);

      dispatch('GET', '/users');
      dispatch('DELETE', '/users');

      expect(all).toHaveBeenCalledTimes(2);
    });

    it('should route an absolute-form target by its path', () => {
      let params: unknown;
      router.get('/users/:id', (req: NodeRequest) => {
        params = req.params;
      });

      dispatch('GET', 'http://example.com/users/42');

      expect(params).toEqual({ id: '42' });
    });
  });

  describe('use() mounts', () => {
    it('should strip the mount path from the URL while the middleware runs', () => {
      let seen: Record<string, string> | undefined;
      router.use('/static', (req: NodeRequest, _res: unknown, next: Next) => {
        seen = {
          url: req.url!,
          baseUrl: req.baseUrl,
          original: req.originalUrl,
        };
        next();
      });

      const { req } = dispatch('GET', '/static/js/app.js?v=1');

      expect(seen).toEqual({
        url: '/js/app.js?v=1',
        baseUrl: '/static',
        original: '/static/js/app.js?v=1',
      });
      // Restored once the middleware calls next()
      expect(req.url).toBe('/static/js/app.js?v=1');
      expect(req.baseUrl).toBe('');
    });

    it('should hand the mount path itself over as "/"', () => {
      let url: string | undefined;
      router.use('/static', (req: NodeRequest) => {
        url = req.url;
      });

      dispatch('GET', '/static');

      expect(url).toBe('/');
    });

    it('should match the mount path segment by segment', () => {
      const middleware = vi.fn();
      router.use('/static', middleware);

      dispatch('GET', '/staticfiles/app.js');

      expect(middleware).not.toHaveBeenCalled();
    });

    it('should match the mount path against the decoded path', () => {
      let url: string | undefined;
      router.use('/static', (req: NodeRequest) => {
        url = req.url;
      });

      dispatch('GET', '/%73tatic/app.js');

      expect(url).toBe('/app.js');
    });

    it('should throw for a middleware that is not a function', () => {
      expect(() => router.use('/a', 'not a function' as any)).toThrow(
        TypeError,
      );
    });
  });

  describe('useExact()', () => {
    it('should only run for requests whose whole path matches', () => {
      const middleware = vi.fn((_req: unknown, _res: unknown, next: Next) =>
        next(),
      );
      router.useExact(undefined, '/admin', middleware);

      dispatch('GET', '/admin');
      dispatch('GET', '/admin/');
      dispatch('GET', '/admin/users');

      expect(middleware).toHaveBeenCalledTimes(2);
    });

    it('should only run for the given method', () => {
      const middleware = vi.fn((_req: unknown, _res: unknown, next: Next) =>
        next(),
      );
      router.useExact('POST', '/admin', middleware);

      dispatch('GET', '/admin');
      dispatch('POST', '/admin');

      expect(middleware).toHaveBeenCalledTimes(1);
    });

    it('should match the same path as the route it guards', () => {
      const calls: string[] = [];
      router.useExact(
        undefined,
        '/admin',
        (_req: unknown, _res: unknown, next: Next) => {
          calls.push('guard');
          next();
        },
      );
      router.get('/admin', () => calls.push('route'));

      dispatch('GET', '/%61dmin');

      expect(calls).toEqual(['guard', 'route']);
    });

    it('should not let a route with an empty parameter skip its middleware', () => {
      const guard = vi.fn();
      const route = vi.fn();
      router.useExact(undefined, '/users/:id/profile', guard);
      router.get('/users/:id/profile', route);

      dispatch('GET', '/users//profile');

      expect(guard).not.toHaveBeenCalled();
      expect(route).not.toHaveBeenCalled();
      expect(finalHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('errors', () => {
    it('should skip to the error-handling middleware', () => {
      const error = new Error('boom');
      const skipped = vi.fn();
      const errorHandler = vi.fn(
        (_err: unknown, _req: unknown, _res: unknown, _next: Next) => {},
      );
      router.use((_req: unknown, _res: unknown, next: Next) => next(error));
      router.use(skipped);
      router.get('/', skipped);
      router.use(errorHandler);

      dispatch('GET', '/');

      expect(skipped).not.toHaveBeenCalled();
      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler.mock.calls[0][0]).toBe(error);
    });

    it('should forward thrown errors and rejected promises', () => {
      const thrown = new Error('thrown');
      router.get('/sync', () => {
        throw thrown;
      });
      router.get('/async', () => Promise.reject(new Error('rejected')));

      dispatch('GET', '/sync');

      expect(finalHandler.mock.calls[0][0]).toBe(thrown);
      return new Promise<void>(resolve => {
        finalHandler.mockImplementation(err => {
          expect(err).toEqual(new Error('rejected'));
          resolve();
        });
        dispatch('GET', '/async');
      });
    });

    it.each([null, false, 0, ''])(
      'should not take next(%j) for an error, as Express does',
      value => {
        const after = vi.fn();
        router.use((_req: unknown, _res: unknown, next: Next) => next(value));
        router.use(after);

        dispatch('GET', '/');

        expect(after).toHaveBeenCalledTimes(1);
      },
    );

    it('should turn a rejection with a falsy value into an error', async () => {
      router.get('/', () => Promise.reject(false));

      await new Promise<void>(resolve => {
        finalHandler.mockImplementation(err => {
          expect(err).toEqual(new Error('Rejected promise'));
          resolve();
        });
        dispatch('GET', '/');
      });
    });

    it('should resume the regular stack when an error handler calls next()', () => {
      const after = vi.fn();
      router.use((_req: unknown, _res: unknown, next: Next) =>
        next(new Error()),
      );
      router.use((_err: unknown, _req: unknown, _res: unknown, next: Next) =>
        next(),
      );
      router.use(after);

      dispatch('GET', '/');

      expect(after).toHaveBeenCalledTimes(1);
    });

    it('should pass a malformed URL to the error handlers as a URIError', () => {
      const middleware = vi.fn();
      const route = vi.fn();
      router.use(middleware);
      router.get('/:id', route);

      dispatch('GET', '/%E0%A4%A');
      dispatch('GET', '/a#b');

      expect(middleware).not.toHaveBeenCalled();
      expect(route).not.toHaveBeenCalled();
      expect(finalHandler.mock.calls[0][0]).toBeInstanceOf(URIError);
      expect(finalHandler.mock.calls[1][0]).toBeInstanceOf(URIError);
    });
  });

  describe('hasMiddleware()', () => {
    it('should tell whether a middleware with the given name is registered', () => {
      function jsonParser() {}
      router.use(jsonParser);
      router.get('/', function routeHandler() {});

      expect(router.hasMiddleware('jsonParser')).toBe(true);
      expect(router.hasMiddleware('urlencodedParser')).toBe(false);
      expect(router.hasMiddleware('routeHandler')).toBe(false);
    });
  });
});
