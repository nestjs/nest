import { RequestMethod, VERSION_NEUTRAL, VersioningType } from '@nestjs/common';
import { pathToRegexp } from 'path-to-regexp';
import { ApplicationConfig } from '../../application-config.js';
import { mapToExcludeRoute } from '../../middleware/utils.js';
import { RoutePathMetadata } from '../../router/interfaces/route-path-metadata.interface.js';
import { RoutePathFactory } from '../../router/route-path-factory.js';

describe('RoutePathFactory', () => {
  let routePathFactory: RoutePathFactory;
  let applicationConfig: ApplicationConfig;

  beforeEach(() => {
    applicationConfig = new ApplicationConfig();
    routePathFactory = new RoutePathFactory(applicationConfig);
  });

  describe('create', () => {
    it('should return valid, concatenated paths (various combinations)', () => {
      expect(
        routePathFactory.create({
          ctrlPath: 'ctrlPath/',
          methodPath: '',
        }),
      ).toEqual(['/ctrlPath']);

      expect(
        routePathFactory.create({
          ctrlPath: '/ctrlPath',
          methodPath: '',
        }),
      ).toEqual(['/ctrlPath']);

      expect(
        routePathFactory.create({
          ctrlPath: '/ctrlPath/',
          methodPath: '/methodPath',
        }),
      ).toEqual(['/ctrlPath/methodPath']);

      expect(
        routePathFactory.create({
          ctrlPath: 'ctrlPath/',
          methodPath: 'methodPath/',
        }),
      ).toEqual(['/ctrlPath/methodPath']);

      expect(
        routePathFactory.create({
          ctrlPath: 'ctrlPath/',
          methodPath: 'methodPath',
          modulePath: 'modulePath',
        }),
      ).toEqual(['/modulePath/ctrlPath/methodPath']);

      expect(
        routePathFactory.create({
          ctrlPath: 'ctrlPath/',
          methodPath: 'methodPath',
          modulePath: '/modulePath',
        }),
      ).toEqual(['/modulePath/ctrlPath/methodPath']);

      expect(
        routePathFactory.create({
          ctrlPath: '/ctrlPath/',
          methodPath: '/methodPath/',
          modulePath: '/modulePath/',
        }),
      ).toEqual(['/modulePath/ctrlPath/methodPath']);

      expect(
        routePathFactory.create({
          ctrlPath: '/ctrlPath/',
          methodPath: '/methodPath/',
          modulePath: '/modulePath/',
          globalPrefix: 'api',
        }),
      ).toEqual(['/api/modulePath/ctrlPath/methodPath']);

      expect(
        routePathFactory.create({
          ctrlPath: '/ctrlPath/',
          methodPath: '/methodPath/',
          modulePath: '/modulePath/',
          globalPrefix: '/api',
        }),
      ).toEqual(['/api/modulePath/ctrlPath/methodPath']);

      expect(
        routePathFactory.create({
          ctrlPath: '/ctrlPath/',
          methodPath: '/methodPath/',
          modulePath: '/modulePath/',
          globalPrefix: '/api',
          versioningOptions: {
            type: VersioningType.HEADER,
            header: 'x',
          },
          methodVersion: '1.0.0',
          controllerVersion: '1.1.1',
        }),
      ).toEqual(['/api/modulePath/ctrlPath/methodPath']);

      expect(
        routePathFactory.create({
          ctrlPath: '/ctrlPath/',
          methodPath: '/methodPath/',
          modulePath: '/modulePath/',
          globalPrefix: '/api/',
          versioningOptions: {
            type: VersioningType.URI,
          },
          methodVersion: '1.0.0',
          controllerVersion: '1.1.1',
        }),
      ).toEqual(['/api/v1.0.0/modulePath/ctrlPath/methodPath']);

      expect(
        routePathFactory.create({
          ctrlPath: '/ctrlPath/',
          methodPath: '/methodPath/',
          modulePath: '/modulePath/',
          versioningOptions: {
            type: VersioningType.URI,
          },
          methodVersion: '1.0.0',
          controllerVersion: '1.1.1',
        }),
      ).toEqual(['/v1.0.0/modulePath/ctrlPath/methodPath']);

      expect(
        routePathFactory.create({
          ctrlPath: '/ctrlPath/',
          methodPath: '/methodPath/',
          globalPrefix: '/api',
          versioningOptions: {
            type: VersioningType.URI,
          },
          methodVersion: '1.0.0',
          controllerVersion: '1.1.1',
        }),
      ).toEqual(['/api/v1.0.0/ctrlPath/methodPath']);

      expect(
        routePathFactory.create({
          ctrlPath: '/ctrlPath/',
          methodPath: '/methodPath/',
          globalPrefix: '/api',
          versioningOptions: {
            type: VersioningType.URI,
          },
          controllerVersion: '1.1.1',
        }),
      ).toEqual(['/api/v1.1.1/ctrlPath/methodPath']);

      expect(
        routePathFactory.create({
          ctrlPath: '/ctrlPath/',
          methodPath: '/methodPath/',
          globalPrefix: '/api',
          versioningOptions: {
            type: VersioningType.URI,
          },
          controllerVersion: ['1.1.1', '1.2.3'],
        }),
      ).toEqual([
        '/api/v1.1.1/ctrlPath/methodPath',
        '/api/v1.2.3/ctrlPath/methodPath',
      ]);

      expect(
        routePathFactory.create({
          ctrlPath: '',
          methodPath: '',
          globalPrefix: '/api',
          versioningOptions: {
            type: VersioningType.URI,
          },
          controllerVersion: ['1.1.1', '1.2.3'],
        }),
      ).toEqual(['/api/v1.1.1', '/api/v1.2.3']);

      expect(
        routePathFactory.create({
          ctrlPath: '',
          methodPath: '',
          globalPrefix: '',
          controllerVersion: VERSION_NEUTRAL,
          versioningOptions: {
            type: VersioningType.URI,
            defaultVersion: VERSION_NEUTRAL,
          },
        }),
      ).toEqual(['/']);

      expect(
        routePathFactory.create({
          ctrlPath: '',
          methodPath: '',
          globalPrefix: '',
          controllerVersion: ['1', VERSION_NEUTRAL],
          versioningOptions: {
            type: VersioningType.URI,
            defaultVersion: ['1', VERSION_NEUTRAL],
          },
        }),
      ).toEqual(['/v1', '/']);

      expect(
        routePathFactory.create({
          ctrlPath: '',
          methodPath: '',
          globalPrefix: '',
        }),
      ).toEqual(['/']);

      vi.spyOn(routePathFactory, 'isExcludedFromGlobalPrefix').mockReturnValue(
        true,
      );
      expect(
        routePathFactory.create({
          ctrlPath: '/ctrlPath/',
          methodPath: '/',
          modulePath: '/',
          globalPrefix: '/api',
        }),
      ).toEqual(['/ctrlPath']);
      vi.restoreAllMocks();
    });

    it('should exclude every URI version of an excluded route from the global prefix', () => {
      vi.spyOn(applicationConfig, 'getGlobalPrefixOptions').mockReturnValue({
        exclude: [
          {
            path: '/cats',
            pathRegex: pathToRegexp('/cats').regexp,
            requestMethod: RequestMethod.ALL,
          },
        ],
      });
      expect(
        routePathFactory.create(
          {
            ctrlPath: '/cats',
            globalPrefix: '/api',
            methodVersion: ['1', '10'],
            versioningOptions: { type: VersioningType.URI },
          },
          RequestMethod.GET,
        ),
      ).toEqual(['/v1/cats', '/v10/cats']);
    });
  });

  describe('isExcludedFromGlobalPrefix', () => {
    describe('when there is no exclude configuration', () => {
      it('should return false', () => {
        vi.spyOn(applicationConfig, 'getGlobalPrefixOptions').mockReturnValue({
          exclude: undefined,
        });
        expect(
          routePathFactory.isExcludedFromGlobalPrefix(
            '/cats',
            RequestMethod.GET,
          ),
        ).toBe(false);
      });
    });
    describe('otherwise', () => {
      describe('when route is not excluded', () => {
        it('should return false', () => {
          vi.spyOn(applicationConfig, 'getGlobalPrefixOptions').mockReturnValue(
            {
              exclude: [
                {
                  path: '/random',
                  pathRegex: pathToRegexp('/random').regexp,
                  requestMethod: RequestMethod.ALL,
                },
              ],
            },
          );
          expect(
            routePathFactory.isExcludedFromGlobalPrefix(
              '/cats',
              RequestMethod.GET,
            ),
          ).toBe(false);
        });
      });
      describe('when route is excluded (by path)', () => {
        it('should return true', () => {
          vi.spyOn(applicationConfig, 'getGlobalPrefixOptions').mockReturnValue(
            {
              exclude: [
                {
                  path: '/cats',
                  pathRegex: pathToRegexp('/cats').regexp,
                  requestMethod: RequestMethod.ALL,
                },
              ],
            },
          );
          expect(
            routePathFactory.isExcludedFromGlobalPrefix(
              '/cats',
              RequestMethod.GET,
            ),
          ).toBe(true);
        });

        describe('when route is excluded (by method and path)', () => {
          it('should return true', () => {
            vi.spyOn(
              applicationConfig,
              'getGlobalPrefixOptions',
            ).mockReturnValue({
              exclude: [
                {
                  path: '/cats',
                  pathRegex: pathToRegexp('/cats').regexp,
                  requestMethod: RequestMethod.GET,
                },
              ],
            });
            expect(
              routePathFactory.isExcludedFromGlobalPrefix(
                '/cats',
                RequestMethod.GET,
              ),
            ).toBe(true);
            expect(
              routePathFactory.isExcludedFromGlobalPrefix(
                '/cats',
                RequestMethod.POST,
              ),
            ).toBe(false);
          });
        });
      });
    });
  });

  describe('getExcludedRoutePaths', () => {
    const uri = { type: VersioningType.URI } as const;

    const createRoute = (
      ctrlPath: string,
      controllerVersion?: RoutePathMetadata['controllerVersion'],
      versioningOptions: RoutePathMetadata['versioningOptions'] = uri,
      requestMethod = RequestMethod.GET,
    ) =>
      routePathFactory.create(
        { ctrlPath, globalPrefix: 'api', controllerVersion, versioningOptions },
        requestMethod,
      );

    const exclude = (...routes: Parameters<typeof mapToExcludeRoute>[0]) =>
      applicationConfig.setGlobalPrefixOptions({
        exclude: mapToExcludeRoute(routes),
      });

    it('should return no routes when nothing is excluded', () => {
      createRoute('hello', '1');
      expect(routePathFactory.getExcludedRoutePaths()).toEqual([]);
    });

    it('should keep an exclusion as configured when its route is unversioned', () => {
      exclude('hello');
      createRoute('hello');
      expect(routePathFactory.getExcludedRoutePaths()).toEqual([
        { path: 'hello', method: RequestMethod.ALL },
      ]);
    });

    it('should keep an exclusion as configured when no route matches it', () => {
      exclude('rawhealth');
      createRoute('hello', '1');
      expect(routePathFactory.getExcludedRoutePaths()).toEqual([
        { path: 'rawhealth', method: RequestMethod.ALL },
      ]);
    });

    it('should prepend the URI version the route is served at', () => {
      exclude({ path: 'hello', method: RequestMethod.GET });
      expect(createRoute('hello', '1')).toEqual(['/v1/hello']);
      expect(routePathFactory.getExcludedRoutePaths()).toEqual([
        { path: '/v1/hello', method: RequestMethod.GET },
      ]);
    });

    it('should return one path per version and deduplicate methods', () => {
      exclude('hello');
      createRoute('hello', ['1', '2'], uri, RequestMethod.GET);
      createRoute('hello', ['1', '2'], uri, RequestMethod.POST);
      expect(routePathFactory.getExcludedRoutePaths()).toEqual([
        { path: '/v1/hello', method: RequestMethod.ALL },
        { path: '/v2/hello', method: RequestMethod.ALL },
      ]);
    });

    it('should keep the unversioned path of a version neutral route', () => {
      exclude('hello');
      createRoute('hello', ['1', VERSION_NEUTRAL]);
      expect(routePathFactory.getExcludedRoutePaths()).toEqual([
        { path: '/v1/hello', method: RequestMethod.ALL },
        { path: 'hello', method: RequestMethod.ALL },
      ]);
    });

    it('should honour a custom URI version prefix', () => {
      exclude('hello');
      createRoute('hello', '1', { type: VersioningType.URI, prefix: false });
      createRoute('hello', '2', { type: VersioningType.URI, prefix: 'ver' });
      expect(routePathFactory.getExcludedRoutePaths()).toEqual([
        { path: '/1/hello', method: RequestMethod.ALL },
        { path: '/ver2/hello', method: RequestMethod.ALL },
      ]);
    });

    it('should prepend the URI version to a wildcard exclusion', () => {
      exclude('hello/{*splat}');
      createRoute('hello/async', '1');
      expect(routePathFactory.getExcludedRoutePaths()).toEqual([
        { path: '/v1/hello/{*splat}', method: RequestMethod.ALL },
      ]);
    });

    it('should not prepend a version for other versioning types', () => {
      exclude('hello');
      createRoute('hello', '1', {
        type: VersioningType.HEADER,
        header: 'X-Version',
      });
      expect(routePathFactory.getExcludedRoutePaths()).toEqual([
        { path: 'hello', method: RequestMethod.ALL },
      ]);
    });
  });

  describe('getVersionPrefix', () => {
    describe('when URI versioning is enabled', () => {
      describe('and prefix is disabled', () => {
        it('should return empty string', () => {
          expect(
            routePathFactory.getVersionPrefix({
              type: VersioningType.URI,
              prefix: false,
            }),
          ).toBe('');
        });
      });
      describe('and prefix is undefined', () => {
        it('should return the default prefix', () => {
          expect(
            routePathFactory.getVersionPrefix({
              type: VersioningType.URI,
            }),
          ).toBe('v');
        });
      });
      describe('and prefix is specified', () => {
        it('should return it', () => {
          expect(
            routePathFactory.getVersionPrefix({
              type: VersioningType.URI,
              prefix: 'test',
            }),
          ).toBe('test');
        });
      });
    });
    describe('when URI versioning is disabled', () => {
      it('should return default prefix', () => {
        expect(
          routePathFactory.getVersionPrefix({
            type: VersioningType.HEADER,
            header: 'X',
          }),
        ).toBe('v');
      });
    });
  });
});
