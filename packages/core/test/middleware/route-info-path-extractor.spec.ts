import { RequestMethod, VERSION_NEUTRAL, VersioningType } from '@nestjs/common';
import { ApplicationConfig } from '@nestjs/core';
import { mapToExcludeRoute } from '@nestjs/core/middleware/utils.js';
import { RouteInfoPathExtractor } from './../../middleware/route-info-path-extractor.js';

describe('RouteInfoPathExtractor', () => {
  describe('extractPathsFrom', () => {
    let appConfig: ApplicationConfig;
    let routeInfoPathExtractor: RouteInfoPathExtractor;

    beforeEach(() => {
      appConfig = new ApplicationConfig();
      appConfig.enableVersioning({
        type: VersioningType.URI,
      });
      routeInfoPathExtractor = new RouteInfoPathExtractor(appConfig);
    });

    it(`should return correct paths`, () => {
      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: '*',
          method: RequestMethod.ALL,
        }),
      ).toEqual(['/*']);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: '*',
          method: RequestMethod.ALL,
          version: '1',
        }),
      ).toEqual(['/v1$', '/v1/*']);
    });

    it(`should return correct paths when set global prefix`, () => {
      Reflect.set(routeInfoPathExtractor, 'prefixPath', '/api');

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: '*',
          method: RequestMethod.ALL,
        }),
      ).toEqual(['/api$', '/api/*']);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: '*',
          method: RequestMethod.ALL,
          version: '1',
        }),
      ).toEqual(['/api/v1$', '/api/v1/*']);
    });

    it(`should return correct paths when set global prefix and global prefix options`, () => {
      Reflect.set(routeInfoPathExtractor, 'prefixPath', '/api');
      Reflect.set(
        routeInfoPathExtractor,
        'excludedGlobalPrefixRoutes',
        mapToExcludeRoute(['foo']),
      );

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: '*',
          method: RequestMethod.ALL,
        }),
      ).toEqual(['/api$', '/api/*', '/foo']);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: '*',
          method: RequestMethod.ALL,
          version: '1',
        }),
      ).toEqual(['/api/v1$', '/api/v1/*', '/v1/foo']);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: 'foo',
          method: RequestMethod.ALL,
          version: '1',
        }),
      ).toEqual(['/v1/foo']);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: 'bar',
          method: RequestMethod.ALL,
          version: '1',
        }),
      ).toEqual(['/api/v1/bar']);
    });

    it(`should not add a version segment for VERSION_NEUTRAL`, () => {
      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: 'cats',
          method: RequestMethod.GET,
          version: VERSION_NEUTRAL,
        }),
      ).toEqual(['/cats']);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: 'cats',
          method: RequestMethod.GET,
          version: ['1', VERSION_NEUTRAL],
        }),
      ).toEqual(['/v1/cats', '/cats']);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: '*',
          method: RequestMethod.ALL,
          version: ['1', VERSION_NEUTRAL],
        }),
      ).toEqual(['/*']);
    });

    describe('when a default version is set', () => {
      const withDefaultVersion = (
        defaultVersion: string | typeof VERSION_NEUTRAL | string[],
      ) => {
        appConfig.enableVersioning({
          type: VersioningType.URI,
          defaultVersion,
        });
        routeInfoPathExtractor = new RouteInfoPathExtractor(appConfig);
      };

      it(`should also add the default version segment to a route without a version`, () => {
        withDefaultVersion('1');
        expect(
          routeInfoPathExtractor.extractPathsFrom({
            path: 'cats',
            method: RequestMethod.GET,
          }),
        ).toEqual(['/cats', '/v1/cats']);

        withDefaultVersion(['1', '2']);
        expect(
          routeInfoPathExtractor.extractPathsFrom({
            path: 'cats',
            method: RequestMethod.GET,
          }),
        ).toEqual(['/cats', '/v1/cats', '/v2/cats']);
      });

      it(`should not add it twice for a VERSION_NEUTRAL default version`, () => {
        withDefaultVersion(VERSION_NEUTRAL);
        expect(
          routeInfoPathExtractor.extractPathsFrom({
            path: 'cats',
            method: RequestMethod.GET,
          }),
        ).toEqual(['/cats']);
      });

      it(`should only add the version segment of a route with a version`, () => {
        withDefaultVersion('1');
        expect(
          routeInfoPathExtractor.extractPathsFrom({
            path: 'cats',
            method: RequestMethod.GET,
            version: '2',
          }),
        ).toEqual(['/v2/cats']);
        expect(
          routeInfoPathExtractor.extractPathsFrom({
            path: 'cats',
            method: RequestMethod.GET,
            version: VERSION_NEUTRAL,
          }),
        ).toEqual(['/cats']);
      });

      it(`should add the default version segment to the routes excluded from the global prefix`, () => {
        withDefaultVersion('1');
        Reflect.set(routeInfoPathExtractor, 'prefixPath', '/api');
        Reflect.set(
          routeInfoPathExtractor,
          'excludedGlobalPrefixRoutes',
          mapToExcludeRoute(['foo']),
        );

        expect(
          routeInfoPathExtractor.extractPathsFrom({
            path: '*',
            method: RequestMethod.ALL,
          }),
        ).toEqual(['/api$', '/api/*', '/foo', '/v1/foo']);
        expect(
          routeInfoPathExtractor.extractPathsFrom({
            path: 'bar',
            method: RequestMethod.ALL,
          }),
        ).toEqual(['/api/bar', '/api/v1/bar']);
      });

      it(`should not add it to an excluded route`, () => {
        withDefaultVersion('1');
        expect(
          routeInfoPathExtractor.extractPathFrom({
            path: 'cats',
            method: RequestMethod.GET,
          }),
        ).toEqual(['/cats']);
      });
    });

    it(`should not add a version segment for VERSION_NEUTRAL when set global prefix`, () => {
      Reflect.set(routeInfoPathExtractor, 'prefixPath', '/api');

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: 'cats',
          method: RequestMethod.GET,
          version: ['1', VERSION_NEUTRAL],
        }),
      ).toEqual(['/api/v1/cats', '/api/cats']);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: '*',
          method: RequestMethod.ALL,
          version: ['1', VERSION_NEUTRAL],
        }),
      ).toEqual(['/api$', '/api/*']);
    });
  });

  describe('extractPathFrom', () => {
    let appConfig: ApplicationConfig;
    let routeInfoPathExtractor: RouteInfoPathExtractor;

    beforeEach(() => {
      appConfig = new ApplicationConfig();
      appConfig.enableVersioning({
        type: VersioningType.URI,
      });
      routeInfoPathExtractor = new RouteInfoPathExtractor(appConfig);
    });

    it(`should return correct path`, () => {
      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: '*',
          method: RequestMethod.ALL,
        }),
      ).toEqual(['/*']);

      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: '*',
          method: RequestMethod.ALL,
          version: '1',
        }),
      ).toEqual(['/v1/*']);
    });

    it(`should return correct path when set global prefix`, () => {
      Reflect.set(routeInfoPathExtractor, 'prefixPath', '/api');

      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: '*',
          method: RequestMethod.ALL,
        }),
      ).toEqual(['/*']);

      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: '*',
          method: RequestMethod.ALL,
          version: '1',
        }),
      ).toEqual(['/api/v1/*']);
    });

    it(`should return correct path when set global prefix and global prefix options`, () => {
      Reflect.set(routeInfoPathExtractor, 'prefixPath', '/api');
      Reflect.set(
        routeInfoPathExtractor,
        'excludedGlobalPrefixRoutes',
        mapToExcludeRoute(['foo']),
      );

      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: '*',
          method: RequestMethod.ALL,
        }),
      ).toEqual(['/*']);

      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: '*',
          method: RequestMethod.ALL,
          version: '1',
        }),
      ).toEqual(['/api/v1/*']);

      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: 'foo',
          method: RequestMethod.ALL,
          version: '1',
        }),
      ).toEqual(['/v1/foo']);

      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: 'bar',
          method: RequestMethod.ALL,
          version: '1',
        }),
      ).toEqual(['/api/v1/bar']);
    });

    it(`should not add a version segment for VERSION_NEUTRAL`, () => {
      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: 'cats',
          method: RequestMethod.GET,
          version: VERSION_NEUTRAL,
        }),
      ).toEqual(['/cats']);
    });
  });

  describe('extractExcludedRoutesCoveredBy', () => {
    let routeInfoPathExtractor: RouteInfoPathExtractor;

    beforeEach(() => {
      const appConfig = new ApplicationConfig();
      appConfig.enableVersioning({
        type: VersioningType.URI,
      });
      appConfig.setGlobalPrefix('api');
      appConfig.setGlobalPrefixOptions({
        exclude: mapToExcludeRoute([
          { path: 'health', method: RequestMethod.GET },
          'users/me',
          'users/:id/avatar',
        ]),
      });
      routeInfoPathExtractor = new RouteInfoPathExtractor(appConfig);
    });

    it(`should return the excluded routes that a route not excluded itself covers`, () => {
      expect(
        routeInfoPathExtractor.extractExcludedRoutesCoveredBy({
          path: '/health',
          method: -1 as RequestMethod,
        }),
      ).toEqual([{ path: '/health', method: RequestMethod.GET }]);

      expect(
        routeInfoPathExtractor.extractExcludedRoutesCoveredBy({
          path: '/users/:id',
          method: RequestMethod.GET,
          version: '1',
        }),
      ).toEqual([
        { path: '/users/me', method: RequestMethod.GET, version: '1' },
      ]);
    });

    it(`should not return the excluded routes the route does not cover`, () => {
      expect(
        routeInfoPathExtractor.extractExcludedRoutesCoveredBy({
          path: '/health',
          method: RequestMethod.POST,
        }),
      ).toEqual([]);

      expect(
        routeInfoPathExtractor.extractExcludedRoutesCoveredBy({
          path: '/users',
          method: RequestMethod.GET,
        }),
      ).toEqual([]);
    });

    it(`should return nothing for a route that is excluded itself or a wildcard`, () => {
      expect(
        routeInfoPathExtractor.extractExcludedRoutesCoveredBy({
          path: '/users/me',
          method: RequestMethod.GET,
        }),
      ).toEqual([]);

      expect(
        routeInfoPathExtractor.extractExcludedRoutesCoveredBy({
          path: '*',
          method: RequestMethod.ALL,
        }),
      ).toEqual([]);
    });

    it(`should skip the excluded routes with parameters or wildcards`, () => {
      expect(
        routeInfoPathExtractor.extractExcludedRoutesCoveredBy({
          path: '/users/:id/:part',
          method: RequestMethod.GET,
        }),
      ).toEqual([]);
    });

    it(`should return the root route of a controller excluded by an optional wildcard`, () => {
      const appConfig = new ApplicationConfig();
      appConfig.setGlobalPrefix('api');
      appConfig.setGlobalPrefixOptions({
        exclude: mapToExcludeRoute(['reports/{*path}', 'files/:name']),
      });
      routeInfoPathExtractor = new RouteInfoPathExtractor(appConfig);

      expect(
        routeInfoPathExtractor.extractExcludedRoutesCoveredBy({
          path: '/reports',
          method: -1 as RequestMethod,
        }),
      ).toEqual([{ path: '/reports/', method: -1 }]);
      expect(
        routeInfoPathExtractor.extractExcludedRoutesCoveredBy({
          path: '/files',
          method: RequestMethod.GET,
        }),
      ).toEqual([]);
    });
  });

  describe('extractExclusionsFrom', () => {
    let routeInfoPathExtractor: RouteInfoPathExtractor;

    beforeEach(() => {
      const appConfig = new ApplicationConfig();
      appConfig.setGlobalPrefix('api');
      appConfig.setGlobalPrefixOptions({
        exclude: mapToExcludeRoute([
          'health',
          'health/ready',
          { path: 'webhooks/stripe', method: RequestMethod.POST },
          'reports/{*path}',
        ]),
      });
      routeInfoPathExtractor = new RouteInfoPathExtractor(appConfig);
    });

    it(`should also return the routes excluded from the global prefix that the route covers`, () => {
      expect(
        routeInfoPathExtractor.extractExclusionsFrom({
          path: '/health/{*path}',
          method: -1 as RequestMethod,
        }),
      ).toEqual([
        { path: '/api/health/{*path}', method: -1 },
        { path: '/health/ready', method: -1 },
      ]);

      expect(
        routeInfoPathExtractor.extractExclusionsFrom({
          path: '/health/(.*)',
          method: -1 as RequestMethod,
        }),
      ).toEqual([
        { path: '/api/health/(.*)', method: -1 },
        { path: '/health/ready', method: -1 },
      ]);

      expect(
        routeInfoPathExtractor.extractExclusionsFrom({
          path: '/webhooks/:provider',
          method: RequestMethod.ALL,
        }),
      ).toEqual([
        { path: '/api/webhooks/:provider', method: RequestMethod.ALL },
        { path: '/webhooks/stripe', method: RequestMethod.POST },
      ]);
    });

    it(`should not return the excluded routes of another request method`, () => {
      expect(
        routeInfoPathExtractor.extractExclusionsFrom({
          path: '/webhooks/:provider',
          method: RequestMethod.GET,
        }),
      ).toEqual([
        { path: '/api/webhooks/:provider', method: RequestMethod.GET },
      ]);
    });

    it(`should return the root route of a controller excluded by an optional wildcard`, () => {
      expect(
        routeInfoPathExtractor.extractExclusionsFrom({
          path: '/reports',
          method: -1 as RequestMethod,
        }),
      ).toEqual([
        { path: '/api/reports', method: -1 },
        { path: '/reports/', method: -1 },
      ]);
    });

    it(`should match the excluded routes case-sensitively unless told otherwise`, () => {
      const route = { path: '/HEALTH/:check', method: -1 as RequestMethod };

      expect(routeInfoPathExtractor.extractExclusionsFrom(route)).toEqual([
        { path: '/api/HEALTH/:check', method: -1 },
      ]);
      expect(
        routeInfoPathExtractor.extractExclusionsFrom(route, {
          caseSensitive: false,
        }),
      ).toEqual([
        { path: '/api/HEALTH/:check', method: -1 },
        { path: '/health/ready', method: -1 },
      ]);
    });

    it(`should only return the route itself when it is excluded or a wildcard`, () => {
      expect(
        routeInfoPathExtractor.extractExclusionsFrom({
          path: '/health/ready',
          method: -1 as RequestMethod,
        }),
      ).toEqual([{ path: '/health/ready', method: -1 }]);

      expect(
        routeInfoPathExtractor.extractExclusionsFrom({
          path: '/{*path}',
          method: -1 as RequestMethod,
        }),
      ).toEqual([{ path: '/{*path}', method: -1 }]);
    });
  });

  describe('extractPathsFrom with a route excluded by an optional wildcard', () => {
    it(`should also return the parent path of the excluded route`, () => {
      const appConfig = new ApplicationConfig();
      appConfig.setGlobalPrefix('api');
      appConfig.setGlobalPrefixOptions({
        exclude: mapToExcludeRoute([
          'reports/{*path}',
          'legacy/*',
          'files/:name',
        ]),
      });
      const routeInfoPathExtractor = new RouteInfoPathExtractor(appConfig);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: '*',
          method: RequestMethod.ALL,
        }),
      ).toEqual([
        '/api$',
        '/api/*',
        '/reports/{*path}',
        '/reports',
        '/legacy/{*path}',
        '/legacy',
        '/files/:name',
      ]);
    });
  });
});
