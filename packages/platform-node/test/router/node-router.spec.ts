import { Socket } from 'net';
import { NodeRequest, NodeResponse } from '../../adapters/node-request.js';
import { NodeRouter, PARAM_TOO_LONG_KEY } from '../../router/node-router.js';

type Next = (err?: any) => void;

function createRequest(method: string, url: string) {
  const req = new NodeRequest(new Socket());
  req.method = method;
  req.url = url;
  return req;
}

// Path matchers are RegExps (path-to-regexp)
function countRegexExecutions(fn: () => void) {
  const { exec } = RegExp.prototype;
  let count = 0;
  RegExp.prototype.exec = function (this: RegExp, input: string) {
    count++;
    return exec.call(this, input);
  };
  try {
    fn();
  } finally {
    RegExp.prototype.exec = exec;
  }
  return count;
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

    it('should run the other matching routes once every handler of the most specific one passes', () => {
      // As a version- or host-filtered handler does when it does not apply
      const calls: string[] = [];
      router.get('/items/:id', (req: NodeRequest) => {
        calls.push(`:id ${req.params.id}`);
      });
      router.get('/items/me', (_req: unknown, _res: unknown, next: Next) => {
        calls.push('me');
        next();
      });

      dispatch('GET', '/items/me');

      expect(calls).toEqual(['me', ':id me']);
      expect(finalHandler).not.toHaveBeenCalled();
    });

    it('should not run the other matching routes after an error', () => {
      const byId = vi.fn();
      router.get('/items/:id', byId);
      router.get('/items/me', (_req: unknown, _res: unknown, next: Next) =>
        next(new Error('failed')),
      );

      dispatch('GET', '/items/me');

      expect(byId).not.toHaveBeenCalled();
      expect(finalHandler.mock.calls[0][0]).toEqual(new Error('failed'));
    });

    it('should match routes with a method changed by earlier middleware', () => {
      // As "method-override" does
      const post = vi.fn();
      const put = vi.fn();
      router.use((req: NodeRequest, _res: unknown, next: Next) => {
        req.method = 'PUT';
        next();
      });
      router.post('/users', post);
      router.put('/users', put);

      dispatch('POST', '/users');

      expect(post).not.toHaveBeenCalled();
      expect(put).toHaveBeenCalledTimes(1);
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

    it('should mount a middleware on each path of a list', () => {
      const mounts: string[] = [];
      router.use(['/css', '/js'], (req: NodeRequest) => {
        mounts.push(`${req.baseUrl} ${req.url}`);
      });

      dispatch('GET', '/css/site.css');
      dispatch('GET', '/js/app.js');
      dispatch('GET', '/img/logo.png');

      expect(mounts).toEqual(['/css /site.css', '/js /app.js']);
    });

    it('should accept a nested list of paths', () => {
      const middleware = vi.fn();
      router.use([['/css'], '/js'], middleware);

      dispatch('GET', '/css/site.css');
      dispatch('GET', '/js/app.js');

      expect(middleware).toHaveBeenCalledTimes(2);
    });

    it('should run the middleware once, mounted on the first matching path, when several paths match', () => {
      const mounts: string[] = [];
      router.use(['/assets', '/assets/js'], (req: NodeRequest) => {
        mounts.push(`${req.baseUrl} ${req.url}`);
      });

      dispatch('GET', '/assets/js/app.js');

      expect(mounts).toEqual(['/assets /js/app.js']);
    });

    it('should not skip a list of paths along with the middleware registered after it under its first path', () => {
      const first = vi.fn((_req: unknown, _res: unknown, next: Next) => next());
      const second = vi.fn();
      router.use(['/a', '/b'], first);
      router.use('/a/x', second);

      dispatch('GET', '/b/y');

      expect(first).toHaveBeenCalledOnce();
      expect(second).not.toHaveBeenCalled();
    });

    it('should match a list holding only "/" against "/" alone, as Express does', () => {
      const middleware = vi.fn();
      router.use(['/'], middleware);

      dispatch('GET', '/a/x');
      expect(middleware).not.toHaveBeenCalled();

      dispatch('GET', '/');
      expect(middleware).toHaveBeenCalledOnce();
    });

    it('should not skip a list holding an empty list, which matches every path', () => {
      const middleware = vi.fn((_req: unknown, _res: unknown, next: Next) =>
        next(),
      );
      router.use(['/a', []], middleware);
      router.use('/a/x', vi.fn());

      dispatch('GET', '/b');

      expect(middleware).toHaveBeenCalledOnce();
    });

    it('should never run a middleware mounted on an empty list of paths', () => {
      const middleware = vi.fn();
      router.use([], middleware);

      dispatch('GET', '/');
      dispatch('GET', '/a/x');

      expect(middleware).not.toHaveBeenCalled();
    });

    it('should throw for a middleware that is not a function', () => {
      expect(() => router.use('/a', 'not a function' as any)).toThrow(
        TypeError,
      );
    });
  });

  describe('maxParamLength', () => {
    it('should answer a request no route matched only because of a parameter length with a 414', () => {
      router.get('/users/:id', vi.fn());

      const { req } = dispatch('GET', `/users/${'x'.repeat(101)}`);

      const err = finalHandler.mock.calls[0][0];
      expect(err).toMatchObject({ status: 414, statusCode: 414, expose: true });
      expect((req as any)[PARAM_TOO_LONG_KEY]).toBe(true);
    });

    it('should let a sibling wildcard take the request', () => {
      const catchAll = vi.fn();
      router.get('/users/:id', vi.fn());
      router.get('/users/*rest', catchAll);

      dispatch('GET', `/users/${'x'.repeat(101)}`);

      expect(catchAll).toHaveBeenCalledTimes(1);
      expect(finalHandler).not.toHaveBeenCalled();
    });

    it('should take the limit from the options', () => {
      const byId = vi.fn();
      router = new NodeRouter(finalHandler, { maxParamLength: 200 });
      router.get('/users/:id', byId);

      dispatch('GET', `/users/${'x'.repeat(150)}`);

      expect(byId).toHaveBeenCalledTimes(1);
    });

    it.each([0, -1, NaN, '100'])(
      'should throw for the maxParamLength %j',
      maxParamLength => {
        expect(
          () => new NodeRouter(finalHandler, { maxParamLength } as any),
        ).toThrow(TypeError);
      },
    );
  });

  describe('case sensitivity', () => {
    it('should match routes, mounts and exact middleware case-sensitively', () => {
      const calls: string[] = [];
      router.use('/static', (_req: unknown, _res: unknown, next: Next) => {
        calls.push('mount');
        next();
      });
      router.useExact(
        'GET',
        '/cats',
        (_req: unknown, _res: unknown, next: Next) => {
          calls.push('exact');
          next();
        },
      );
      router.get('/cats', () => calls.push('route'));
      router.get('/files/{*path}', () => calls.push('wildcard'));

      dispatch('GET', '/STATIC/x');
      dispatch('GET', '/CATS');
      dispatch('GET', '/FILES/a');
      expect(calls).toEqual([]);
      expect(finalHandler).toHaveBeenCalledTimes(3);

      dispatch('GET', '/static/x');
      dispatch('GET', '/cats');
      dispatch('GET', '/files/a');
      expect(calls).toEqual(['mount', 'exact', 'route', 'wildcard']);
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

    it('should decode the parameters of the path, as Express does', () => {
      const names: unknown[] = [];
      router.useExact(
        undefined,
        '/files/:name',
        (req: any, _res: unknown, next: Next) => {
          names.push(req.params.name);
          next();
        },
      );

      dispatch('GET', '/files/report');
      // The routing path keeps an encoded "/" encoded
      dispatch('GET', '/files/2026%2F10');

      expect(names).toEqual(['report', '2026/10']);
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

  describe('path prefixes', () => {
    function record(calls: string[], name: string) {
      return (_req: unknown, _res: unknown, next: Next) => {
        calls.push(name);
        next();
      };
    }

    it('should run the same middleware whatever the paths registered before', () => {
      const calls: string[] = [];
      router.useExact(undefined, '/admin', record(calls, '/admin'));
      router.useExact(undefined, '/admin/:id', record(calls, '/admin/:id'));
      router.useExact('GET', '/admin/users', record(calls, '/admin/users'));
      router.use(record(calls, 'root'));
      router.useExact(undefined, '/admin/logs', record(calls, '/admin/logs'));
      router.use('/admin', record(calls, 'mount'));
      router.get('/admin/{*path}', () => calls.push('route'));
      router.useExact(undefined, '/admin/late', record(calls, '/admin/late'));
      router.use(() => calls.push('last'));

      dispatch('GET', '/users');
      expect(calls).toEqual(['root', 'last']);

      calls.length = 0;
      dispatch('GET', '/admin/logs');
      expect(calls).toEqual([
        '/admin/:id',
        'root',
        '/admin/logs',
        'mount',
        'route',
      ]);

      calls.length = 0;
      dispatch('GET', '/admin/users');
      expect(calls).toEqual([
        '/admin/:id',
        '/admin/users',
        'root',
        'mount',
        'route',
      ]);
    });

    it('should take the layers added after a request into account', () => {
      const calls: string[] = [];
      router.useExact(undefined, '/a/b', record(calls, '/a/b'));
      dispatch('GET', '/x');
      router.useExact(undefined, '/a/c', record(calls, '/a/c'));
      router.use(record(calls, 'root'));

      dispatch('GET', '/a/c');

      expect(calls).toEqual(['/a/c', 'root']);
    });

    it('should not run the matcher of every middleware layer bound to other controllers', () => {
      // Nest registers a middleware bound to a controller once per route path
      const middleware = vi.fn((_req: unknown, _res: unknown, next: Next) =>
        next(),
      );
      for (let i = 0; i < 100; i++) {
        for (const route of ['', '/:id', '/:id/items', '/:id/items/:itemId']) {
          router.useExact('GET', `/api/res${i}${route}`, middleware);
        }
      }
      const handler = vi.fn();
      router.get('/api/res57/:id/items/:itemId', handler);

      const count = countRegexExecutions(() =>
        dispatch('GET', '/api/res57/42/items/7'),
      );

      expect(handler).toHaveBeenCalledTimes(1);
      expect(middleware).toHaveBeenCalledTimes(1);
      // About one per layer without skipping (401)
      expect(count).toBeLessThan(50);
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

    it('should report a request target it cannot route to onRejectedTarget, before the error handlers', () => {
      const calls: string[] = [];
      router.onRejectedTarget = req => calls.push(`rejected ${req.url}`);
      router.use((err: unknown, req: any, res: any, next: Next) => {
        calls.push(`error handler ${req.url}`);
        next(err);
      });
      router.get('/:id', () => {});

      dispatch('GET', '/%E0%A4%A');
      dispatch('GET', '/ok');

      expect(calls).toEqual(['rejected /%E0%A4%A', 'error handler /%E0%A4%A']);
      expect(finalHandler.mock.calls[0][0]).toBeInstanceOf(URIError);
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
