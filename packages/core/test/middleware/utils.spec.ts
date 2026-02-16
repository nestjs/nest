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
  });
  describe('filterMiddleware', () => {
    let middleware: any[];
    beforeEach(() => {
      middleware = [Test, fnMiddleware, undefined, null];
    });
    it('should return filtered middleware', () => {
      expect(filterMiddleware(middleware, [], noopAdapter)).toHaveLength(2);
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
  });
});
