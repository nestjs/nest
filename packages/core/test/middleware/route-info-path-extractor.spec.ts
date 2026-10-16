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
});
