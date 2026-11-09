import {
  RequestMethod,
  VERSION_NEUTRAL,
  type VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import { ApplicationConfig } from '@nestjs/core';
import { mapToExcludeRoute } from '@nestjs/core/middleware/utils';
import { expect } from 'chai';
import { RouteInfoPathExtractor } from './../../middleware/route-info-path-extractor';

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
      ).to.eql(['/*']);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: '*',
          method: RequestMethod.ALL,
          version: '1',
        }),
      ).to.eql(['/v1$', '/v1/*']);
    });

    it(`should return correct paths when set global prefix`, () => {
      Reflect.set(routeInfoPathExtractor, 'prefixPath', '/api');

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: '*',
          method: RequestMethod.ALL,
        }),
      ).to.eql(['/api$', '/api/*']);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: '*',
          method: RequestMethod.ALL,
          version: '1',
        }),
      ).to.eql(['/api/v1$', '/api/v1/*']);
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
      ).to.eql(['/api$', '/api/*', '/foo', '/v:nestUriVersion/foo']);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: '*',
          method: RequestMethod.ALL,
          version: '1',
        }),
      ).to.eql(['/api/v1$', '/api/v1/*', '/v1/foo']);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: 'foo',
          method: RequestMethod.ALL,
          version: '1',
        }),
      ).to.eql(['/v1/foo']);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: 'bar',
          method: RequestMethod.ALL,
          version: '1',
        }),
      ).to.eql(['/api/v1/bar']);
    });

    it(`should not add a version segment for VERSION_NEUTRAL`, () => {
      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: 'cats',
          method: RequestMethod.GET,
          version: VERSION_NEUTRAL,
        }),
      ).to.eql(['/cats']);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: 'cats',
          method: RequestMethod.GET,
          version: ['1', VERSION_NEUTRAL],
        }),
      ).to.eql(['/v1/cats', '/cats']);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: '*',
          method: RequestMethod.ALL,
          version: ['1', VERSION_NEUTRAL],
        }),
      ).to.eql(['/*']);
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
        ).to.eql(['/cats', '/v1/cats']);

        withDefaultVersion(['1', '2']);
        expect(
          routeInfoPathExtractor.extractPathsFrom({
            path: 'cats',
            method: RequestMethod.GET,
          }),
        ).to.eql(['/cats', '/v1/cats', '/v2/cats']);
      });

      it(`should not add it twice for a VERSION_NEUTRAL default version`, () => {
        withDefaultVersion(VERSION_NEUTRAL);
        expect(
          routeInfoPathExtractor.extractPathsFrom({
            path: 'cats',
            method: RequestMethod.GET,
          }),
        ).to.eql(['/cats']);
      });

      it(`should only add the version segment of a route with a version`, () => {
        withDefaultVersion('1');
        expect(
          routeInfoPathExtractor.extractPathsFrom({
            path: 'cats',
            method: RequestMethod.GET,
            version: '2',
          }),
        ).to.eql(['/v2/cats']);
        expect(
          routeInfoPathExtractor.extractPathsFrom({
            path: 'cats',
            method: RequestMethod.GET,
            version: VERSION_NEUTRAL,
          }),
        ).to.eql(['/cats']);
      });

      it(`should cover the routes excluded from the global prefix under any version for a wildcard`, () => {
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
        ).to.eql(['/api$', '/api/*', '/foo', '/v:nestUriVersion/foo']);
        expect(
          routeInfoPathExtractor.extractPathsFrom({
            path: 'bar',
            method: RequestMethod.ALL,
          }),
        ).to.eql(['/api/bar', '/api/v1/bar']);
      });

      it(`should not add it to an excluded route`, () => {
        withDefaultVersion('1');
        expect(
          routeInfoPathExtractor.extractPathFrom({
            path: 'cats',
            method: RequestMethod.GET,
          }),
        ).to.eql(['/cats']);
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
      ).to.eql(['/api/v1/cats', '/api/cats']);

      expect(
        routeInfoPathExtractor.extractPathsFrom({
          path: '*',
          method: RequestMethod.ALL,
          version: ['1', VERSION_NEUTRAL],
        }),
      ).to.eql(['/api$', '/api/*']);
    });

    describe('when a route is excluded from the global prefix', () => {
      const withExcludedRoute = (
        versioning: VersioningOptions = { type: VersioningType.URI },
      ) => {
        appConfig.enableVersioning(versioning);
        routeInfoPathExtractor = new RouteInfoPathExtractor(appConfig);
        Reflect.set(routeInfoPathExtractor, 'prefixPath', '/api');
        Reflect.set(
          routeInfoPathExtractor,
          'excludedGlobalPrefixRoutes',
          mapToExcludeRoute(['foo']),
        );
      };

      it(`should use the version prefix for the path of any version`, () => {
        withExcludedRoute({ type: VersioningType.URI, prefix: 'ver' });
        expect(
          routeInfoPathExtractor.extractPathsFrom({
            path: '*',
            method: RequestMethod.ALL,
          }),
        ).to.eql(['/api$', '/api/*', '/foo', '/ver:nestUriVersion/foo']);

        withExcludedRoute({ type: VersioningType.URI, prefix: false });
        expect(
          routeInfoPathExtractor.extractPathsFrom({
            path: '*',
            method: RequestMethod.ALL,
          }),
        ).to.eql(['/api$', '/api/*', '/foo', '/:nestUriVersion/foo']);
      });

      it(`should cover any version for a VERSION_NEUTRAL wildcard`, () => {
        withExcludedRoute();
        expect(
          routeInfoPathExtractor.extractPathsFrom({
            path: '*',
            method: RequestMethod.ALL,
            version: ['1', VERSION_NEUTRAL],
          }),
        ).to.eql(['/api$', '/api/*', '/foo', '/v:nestUriVersion/foo']);
      });

      it(`should only cover the versions of a wildcard limited to them`, () => {
        withExcludedRoute({ type: VersioningType.URI, defaultVersion: '1' });
        expect(
          routeInfoPathExtractor.extractPathsFrom({
            path: '*',
            method: RequestMethod.ALL,
            version: ['2', '3'],
          }),
        ).to.eql([
          '/api/v2$',
          '/api/v2/*',
          '/api/v3$',
          '/api/v3/*',
          '/v2/foo',
          '/v3/foo',
        ]);
      });

      it(`should not cover any version without URI versioning`, () => {
        withExcludedRoute({
          type: VersioningType.HEADER,
          header: 'x-version',
        });
        expect(
          routeInfoPathExtractor.extractPathsFrom({
            path: '*',
            method: RequestMethod.ALL,
          }),
        ).to.eql(['/api$', '/api/*', '/foo']);
      });
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
      ).to.eql(['/*']);

      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: '*',
          method: RequestMethod.ALL,
          version: '1',
        }),
      ).to.eql(['/v1/*']);
    });

    it(`should return correct path when set global prefix`, () => {
      Reflect.set(routeInfoPathExtractor, 'prefixPath', '/api');

      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: '*',
          method: RequestMethod.ALL,
        }),
      ).to.eql(['/*']);

      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: '*',
          method: RequestMethod.ALL,
          version: '1',
        }),
      ).to.eql(['/api/v1/*']);
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
      ).to.eql(['/*']);

      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: '*',
          method: RequestMethod.ALL,
          version: '1',
        }),
      ).to.eql(['/api/v1/*']);

      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: 'foo',
          method: RequestMethod.ALL,
          version: '1',
        }),
      ).to.eql(['/v1/foo']);

      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: 'bar',
          method: RequestMethod.ALL,
          version: '1',
        }),
      ).to.eql(['/api/v1/bar']);
    });

    it(`should not add a version segment for VERSION_NEUTRAL`, () => {
      expect(
        routeInfoPathExtractor.extractPathFrom({
          path: 'cats',
          method: RequestMethod.GET,
          version: VERSION_NEUTRAL,
        }),
      ).to.eql(['/cats']);
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
      ).to.eql([{ path: '/health', method: RequestMethod.GET }]);

      expect(
        routeInfoPathExtractor.extractExcludedRoutesCoveredBy({
          path: '/users/:id',
          method: RequestMethod.GET,
          version: '1',
        }),
      ).to.eql([
        { path: '/users/me', method: RequestMethod.GET, version: '1' },
      ]);
    });

    it(`should not return the excluded routes the route does not cover`, () => {
      expect(
        routeInfoPathExtractor.extractExcludedRoutesCoveredBy({
          path: '/health',
          method: RequestMethod.POST,
        }),
      ).to.eql([]);

      expect(
        routeInfoPathExtractor.extractExcludedRoutesCoveredBy({
          path: '/users',
          method: RequestMethod.GET,
        }),
      ).to.eql([]);
    });

    it(`should return nothing for a route that is excluded itself or a wildcard`, () => {
      expect(
        routeInfoPathExtractor.extractExcludedRoutesCoveredBy({
          path: '/users/me',
          method: RequestMethod.GET,
        }),
      ).to.eql([]);

      expect(
        routeInfoPathExtractor.extractExcludedRoutesCoveredBy({
          path: '*',
          method: RequestMethod.ALL,
        }),
      ).to.eql([]);
    });

    it(`should skip the excluded routes with parameters or wildcards`, () => {
      expect(
        routeInfoPathExtractor.extractExcludedRoutesCoveredBy({
          path: '/users/:id/:part',
          method: RequestMethod.GET,
        }),
      ).to.eql([]);
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
      ).to.eql([{ path: '/reports/', method: -1 }]);
      expect(
        routeInfoPathExtractor.extractExcludedRoutesCoveredBy({
          path: '/files',
          method: RequestMethod.GET,
        }),
      ).to.eql([]);
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
      ).to.eql([
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
