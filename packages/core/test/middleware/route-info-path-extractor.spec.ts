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
