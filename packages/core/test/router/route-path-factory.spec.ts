import { RequestMethod, VERSION_NEUTRAL, VersioningType } from '@nestjs/common';
import { pathToRegexp } from 'path-to-regexp';
import { ApplicationConfig } from '../../application-config.js';
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
