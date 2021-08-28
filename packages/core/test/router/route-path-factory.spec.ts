import { RequestMethod, VersioningType } from '@nestjs/common';
import * as pathToRegexp from 'path-to-regexp';
import * as sinon from 'sinon';
import { ApplicationConfig } from '../../application-config';
import { RoutePathFactory } from '../../router/route-path-factory';

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
        }),
      ).toEqual(['/']);
    });
  });

  describe('isExcludedFromGlobalPrefix', () => {
    describe('when there is no exclude configuration', () => {
      it('should return false', () => {
        sinon.stub(applicationConfig, 'getGlobalPrefixOptions').returns({
          exclude: undefined,
        });
        expect(
          routePathFactory.isExcludedFromGlobalPrefix(
            '/cats',
            RequestMethod.GET,
          ),
        ).toBeFalsy();
      });
    });
    describe('otherwise', () => {
      describe('when route is not excluded', () => {
        it('should return false', () => {
          sinon.stub(applicationConfig, 'getGlobalPrefixOptions').returns({
            exclude: [
              {
                pathRegex: pathToRegexp('/random'),
                requestMethod: RequestMethod.ALL,
              },
            ],
          });
          expect(
            routePathFactory.isExcludedFromGlobalPrefix(
              '/cats',
              RequestMethod.GET,
            ),
          ).toBeFalsy();
        });
      });
      describe('when route is excluded (by path)', () => {
        it('should return true', () => {
          sinon.stub(applicationConfig, 'getGlobalPrefixOptions').returns({
            exclude: [
              {
                pathRegex: pathToRegexp('/cats'),
                requestMethod: RequestMethod.ALL,
              },
            ],
          });
          expect(
            routePathFactory.isExcludedFromGlobalPrefix(
              '/cats',
              RequestMethod.GET,
            ),
          ).toBeTruthy();
        });

        describe('when route is excluded (by method and path)', () => {
          it('should return true', () => {
            sinon.stub(applicationConfig, 'getGlobalPrefixOptions').returns({
              exclude: [
                {
                  pathRegex: pathToRegexp('/cats'),
                  requestMethod: RequestMethod.GET,
                },
              ],
            });
            expect(
              routePathFactory.isExcludedFromGlobalPrefix(
                '/cats',
                RequestMethod.GET,
              ),
            ).toBeTruthy();
            expect(
              routePathFactory.isExcludedFromGlobalPrefix(
                '/cats',
                RequestMethod.POST,
              ),
            ).toBeFalsy();
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
          ).toEqual('');
        });
      });
      describe('and prefix is undefined', () => {
        it('should return the default prefix', () => {
          expect(
            routePathFactory.getVersionPrefix({
              type: VersioningType.URI,
            }),
          ).toEqual('v');
        });
      });
      describe('and prefix is specified', () => {
        it('should return it', () => {
          expect(
            routePathFactory.getVersionPrefix({
              type: VersioningType.URI,
              prefix: 'test',
            }),
          ).toEqual('test');
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
        ).toEqual('v');
      });
    });
  });
});
