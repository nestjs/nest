import { RequestMethod } from '@nestjs/common';
import { ResolvedRoute } from '../../router/interfaces/resolved-route.interface.js';
import { RouteSpecificitySorter } from '../../router/route-specificity-sorter.js';

const makeResolvedRoute = (
  overrides: Partial<ResolvedRoute> & { path: string },
): ResolvedRoute => ({
  method: RequestMethod.GET,
  host: undefined,
  version: undefined,
  methodVersion: undefined,
  controllerVersion: undefined,
  handler: (() => undefined) as ResolvedRoute['handler'],
  targetCallback: (() => undefined) as ResolvedRoute['targetCallback'],
  methodName: 'handler',
  instanceWrapper: {
    name: 'TestController',
  } as ResolvedRoute['instanceWrapper'],
  ...overrides,
});

const pathsOf = (routes: ResolvedRoute[]): string[] =>
  routes.map(route => route.path);

describe('RouteSpecificitySorter', () => {
  describe('sort', () => {
    it('should put a static route before a parametric route at the same length', () => {
      const parametricRoute = makeResolvedRoute({ path: '/users/:userId' });
      const staticRoute = makeResolvedRoute({ path: '/users/me' });

      const sorted = RouteSpecificitySorter.sort([
        parametricRoute,
        staticRoute,
      ]);

      expect(pathsOf(sorted)).toEqual(['/users/me', '/users/:userId']);
    });

    it('should put a parametric route before a wildcard route at the same length', () => {
      const wildcardRoute = makeResolvedRoute({ path: '/users/*rest' });
      const parametricRoute = makeResolvedRoute({ path: '/users/:userId' });

      const sorted = RouteSpecificitySorter.sort([
        wildcardRoute,
        parametricRoute,
      ]);

      expect(pathsOf(sorted)).toEqual(['/users/:userId', '/users/*rest']);
    });

    it('should treat adapter-normalized wildcard groups as wildcard routes', () => {
      const wildcardRoute = makeResolvedRoute({ path: '/users/{*rest}' });
      const parametricRoute = makeResolvedRoute({ path: '/users/:userId' });

      const sorted = RouteSpecificitySorter.sort([
        wildcardRoute,
        parametricRoute,
      ]);

      expect(pathsOf(sorted)).toEqual(['/users/:userId', '/users/{*rest}']);
    });

    it('should fully order literal < param < wildcard across a triple', () => {
      const wildcardRoute = makeResolvedRoute({ path: '/users/*rest' });
      const staticRoute = makeResolvedRoute({ path: '/users/me' });
      const parametricRoute = makeResolvedRoute({ path: '/users/:userId' });

      const sorted = RouteSpecificitySorter.sort([
        wildcardRoute,
        staticRoute,
        parametricRoute,
      ]);

      expect(pathsOf(sorted)).toEqual([
        '/users/me',
        '/users/:userId',
        '/users/*rest',
      ]);
    });

    it('should keep declaration order when specificities tie', () => {
      const firstStatic = makeResolvedRoute({
        path: '/users/me',
        methodName: 'first',
      });
      const secondStatic = makeResolvedRoute({
        path: '/orders/list',
        methodName: 'second',
      });
      const thirdStatic = makeResolvedRoute({
        path: '/items/all',
        methodName: 'third',
      });

      const sorted = RouteSpecificitySorter.sort([
        firstStatic,
        secondStatic,
        thirdStatic,
      ]);

      expect(sorted.map(route => route.methodName)).toEqual([
        'first',
        'second',
        'third',
      ]);
    });

    it('should prefer the path that is more specific at the earliest differing segment', () => {
      const ambiguousLater = makeResolvedRoute({
        path: '/users/:userId/orders',
      });
      const specificEarlier = makeResolvedRoute({
        path: '/users/me/:resource',
      });

      const sorted = RouteSpecificitySorter.sort([
        ambiguousLater,
        specificEarlier,
      ]);

      expect(pathsOf(sorted)).toEqual([
        '/users/me/:resource',
        '/users/:userId/orders',
      ]);
    });

    it('should treat a shorter path as less specific than a longer one when the missing segment slot decides it', () => {
      const shorterRoute = makeResolvedRoute({ path: '/users' });
      const longerRoute = makeResolvedRoute({ path: '/users/me' });

      const sorted = RouteSpecificitySorter.sort([shorterRoute, longerRoute]);

      expect(pathsOf(sorted)).toEqual(['/users/me', '/users']);
    });

    it('should not mutate the input array', () => {
      const parametricRoute = makeResolvedRoute({ path: '/users/:userId' });
      const staticRoute = makeResolvedRoute({ path: '/users/me' });
      const input = [parametricRoute, staticRoute];

      RouteSpecificitySorter.sort(input);

      expect(input).toEqual([parametricRoute, staticRoute]);
    });

    it('should return references to the same route objects (no defensive copy)', () => {
      const parametricRoute = makeResolvedRoute({ path: '/users/:userId' });
      const staticRoute = makeResolvedRoute({ path: '/users/me' });

      const sorted = RouteSpecificitySorter.sort([
        parametricRoute,
        staticRoute,
      ]);

      expect(sorted[0]).toBe(staticRoute);
      expect(sorted[1]).toBe(parametricRoute);
    });

    it('should handle an empty input', () => {
      expect(RouteSpecificitySorter.sort([])).toEqual([]);
    });

    it('should handle a single-element input by returning it unchanged', () => {
      const onlyRoute = makeResolvedRoute({ path: '/users/me' });
      expect(RouteSpecificitySorter.sort([onlyRoute])).toEqual([onlyRoute]);
    });
  });
});
