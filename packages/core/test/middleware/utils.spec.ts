import { RequestMethod } from '@nestjs/common';
import { addLeadingSlash } from '@nestjs/common/utils/shared.utils.js';
import { pathToRegexp } from 'path-to-regexp';
import {
  assignToken,
  filterMiddleware,
  isMiddlewareClass,
  isMiddlewareRouteExcluded,
  mapToClass,
  mapToExcludeRoute,
} from '../../middleware/utils.js';
import { NoopHttpAdapter } from '../utils/noop-adapter.js';

describe('middleware utils', () => {
  const noopAdapter = new NoopHttpAdapter({});

  class Test {}
  function fnMiddleware(req, res, next) {}

  describe('mapToExcludeRoute', () => {
    it('should return exclude route metadata', () => {
      const stringRoute = 'foo';
      const routeInfo = {
        path: 'bar',
        method: RequestMethod.GET,
      };
      expect(mapToExcludeRoute([stringRoute, routeInfo])).toEqual([
        {
          path: stringRoute,
          requestMethod: RequestMethod.ALL,
          pathRegex: pathToRegexp(addLeadingSlash(stringRoute)).regexp,
        },
        {
          path: routeInfo.path,
          requestMethod: routeInfo.method,
          pathRegex: pathToRegexp(addLeadingSlash(routeInfo.path)).regexp,
        },
      ]);
    });
    describe('when route matching options are given', () => {
      const matches = (
        path: string,
        options: { caseSensitive: boolean; ignoreTrailingSlash: boolean },
        url: string,
      ) => mapToExcludeRoute([path], options)[0].pathRegex.test(url);

      it('should match paths case-sensitively when the router does', () => {
        const options = { caseSensitive: true, ignoreTrailingSlash: true };
        expect(matches('users/login', options, '/users/login')).toBe(true);
        expect(matches('users/login', options, '/users/LOGIN')).toBe(false);
      });
      it('should match paths case-insensitively when the router does', () => {
        const options = { caseSensitive: false, ignoreTrailingSlash: true };
        expect(matches('users/login', options, '/users/LOGIN')).toBe(true);
      });
      it('should match a trailing slash only when the router ignores it', () => {
        expect(
          matches(
            'users/login',
            { caseSensitive: false, ignoreTrailingSlash: false },
            '/users/login/',
          ),
        ).toBe(false);
        expect(
          matches(
            'users/login',
            { caseSensitive: false, ignoreTrailingSlash: true },
            '/users/login/',
          ),
        ).toBe(true);
      });
      it('should match an excluded path written with a trailing slash like its route', () => {
        const strict = { caseSensitive: true, ignoreTrailingSlash: false };
        expect(matches('users/login/', strict, '/users/login')).toBe(true);
        expect(matches('users/login/', strict, '/users/login/')).toBe(false);

        const loose = { caseSensitive: true, ignoreTrailingSlash: true };
        expect(matches('users/login/', loose, '/users/login')).toBe(true);
        expect(matches('users/login/', loose, '/users/login/')).toBe(true);
        expect(matches('users/login/', loose, '/users/login//')).toBe(false);
      });
      it('should keep matching the root path', () => {
        const strict = { caseSensitive: true, ignoreTrailingSlash: false };
        expect(matches('/', strict, '/')).toBe(true);
        expect(matches('/', strict, '/users')).toBe(false);
      });
    });
  });
  describe('filterMiddleware', () => {
    let middleware: any[];
    beforeEach(() => {
      middleware = [Test, fnMiddleware, undefined, null];
    });
    it('should return filtered middleware', () => {
      expect(filterMiddleware(middleware, [], noopAdapter)).toHaveLength(2);
    });
    describe('when the adapter tells how its router matches paths', () => {
      class StrictRouterAdapter extends NoopHttpAdapter {
        getRouteMatchingOptions() {
          return { caseSensitive: true, ignoreTrailingSlash: false };
        }
      }

      it('should skip the middleware only for requests the router serves with an excluded route', () => {
        const adapter = new StrictRouterAdapter({});
        vi.spyOn(adapter, 'getRequestMethod').mockReturnValue('GET');
        const getRequestUrl = vi.spyOn(adapter, 'getRequestUrl');
        const fn = vi.fn();
        const next = vi.fn();
        const [Middleware] = filterMiddleware(
          [fn],
          [{ path: 'users/login', method: RequestMethod.GET }],
          adapter,
        );
        const instance = new Middleware();

        getRequestUrl.mockReturnValue('/users/login?redirect=1');
        instance.use({}, {}, next);
        expect(next).toHaveBeenCalledOnce();
        expect(fn).not.toHaveBeenCalled();

        for (const url of ['/users/LOGIN', '/users/Login', '/users/login/']) {
          getRequestUrl.mockReturnValue(url);
          instance.use({}, {}, next);
        }
        expect(fn).toHaveBeenCalledTimes(3);
        expect(next).toHaveBeenCalledOnce();
      });
    });
  });
  describe('mapToClass', () => {
    describe('when middleware is a class', () => {
      describe('when there is no excluded routes', () => {
        it('should return an identity', () => {
          const type = mapToClass(Test, [], noopAdapter);
          expect(type).toEqual(Test);
        });
      });
      describe('when there are excluded routes', () => {
        it('should return a host class', () => {
          const type = mapToClass(
            Test,
            mapToExcludeRoute([{ path: '*', method: RequestMethod.ALL }]),
            noopAdapter,
          );
          expect(type).not.toEqual(Test);
          expect(type.name).toEqual(Test.name);
        });
      });
    });
    describe('when middleware is a function', () => {
      it('should return a metatype', () => {
        const metatype = mapToClass(fnMiddleware, [], noopAdapter);
        expect(metatype).not.toEqual(fnMiddleware);
      });
      it('should define a `use` method', () => {
        const metatype = mapToClass(fnMiddleware, [], noopAdapter);
        expect(new metatype().use).toBeDefined();
      });
      it('should encapsulate a function', () => {
        const spy = vi.fn();
        const metatype = mapToClass(spy, [], noopAdapter);
        new metatype().use();
        expect(spy).toHaveBeenCalled();
      });
    });
  });
  describe('isMiddlewareClass', () => {
    describe('when middleware is a class', () => {
      it('should returns true', () => {
        expect(isMiddlewareClass(Test)).toBe(true);
      });
    });
    describe('when middleware is a function', () => {
      it('should returns false', () => {
        expect(isMiddlewareClass(fnMiddleware)).toBe(false);
      });
    });
  });
  describe('assignToken', () => {
    it('should define `name` property on metatype', () => {
      const AnonymousType = class {};
      assignToken(AnonymousType);
      expect(AnonymousType.name).toBeDefined();
    });
    it('should use passed token as `name`', () => {
      const AnonymousType = class {};
      const token = 'token';

      assignToken(AnonymousType, token);
      expect(AnonymousType.name).toBe(token);
    });
  });

  describe('isRouteExcluded', () => {
    let adapter: NoopHttpAdapter;

    beforeEach(() => {
      adapter = new NoopHttpAdapter({});
      vi.spyOn(adapter, 'getRequestMethod').mockImplementation(() => 'GET');
      vi.spyOn(adapter, 'getRequestUrl').mockImplementation(() => '/cats/3');
    });
    describe('when route is excluded (new syntax *path)', () => {
      const path = '/cats/*path';
      const excludedRoutes = mapToExcludeRoute([
        {
          path,
          method: RequestMethod.GET,
        },
      ]);
      it('should return true', () => {
        expect(isMiddlewareRouteExcluded({}, excludedRoutes, adapter)).toBe(
          true,
        );
      });
    });
    describe('when route is excluded (legacy syntax (.*))', () => {
      const path = '/cats/(.*)';
      const excludedRoutes = mapToExcludeRoute([
        {
          path,
          method: RequestMethod.GET,
        },
      ]);
      it('should return true', () => {
        expect(isMiddlewareRouteExcluded({}, excludedRoutes, adapter)).toBe(
          true,
        );
      });
    });
    describe('when route is not excluded', () => {
      it('should return false', () => {
        expect(isMiddlewareRouteExcluded({}, [], adapter)).toBe(false);
      });
    });
    describe('when a HEAD request targets a route excluded for GET', () => {
      const excludedRoutes = mapToExcludeRoute([
        {
          path: '/cats/*path',
          method: RequestMethod.GET,
        },
      ]);
      it('should return true', () => {
        vi.spyOn(adapter, 'getRequestMethod').mockImplementation(() => 'HEAD');
        expect(isMiddlewareRouteExcluded({}, excludedRoutes, adapter)).toBe(
          true,
        );
      });
    });
    describe('when a GET request targets a route excluded only for HEAD', () => {
      const excludedRoutes = mapToExcludeRoute([
        {
          path: '/cats/*path',
          method: RequestMethod.HEAD,
        },
      ]);
      it('should return false', () => {
        expect(isMiddlewareRouteExcluded({}, excludedRoutes, adapter)).toBe(
          false,
        );
      });
    });
  });
});
