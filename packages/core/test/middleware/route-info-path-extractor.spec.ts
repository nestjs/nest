import { RequestMethod, VersioningType } from '@nestjs/common';
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
      ).to.eql(['/api$', '/api/*', '/foo']);

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
  });
});
