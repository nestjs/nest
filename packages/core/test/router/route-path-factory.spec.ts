import { RequestMethod, VERSION_NEUTRAL, VersioningType } from '@nestjs/common';
import { expect } from 'chai';
import { pathToRegexp } from 'path-to-regexp';
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
      ).to.deep.equal(['/ctrlPath']);

      expect(
        routePathFactory.create({
          ctrlPath: '/ctrlPath',
          methodPath: '',
        }),
      ).to.deep.equal(['/ctrlPath']);

      expect(
        routePathFactory.create({
          ctrlPath: '/ctrlPath/',
          methodPath: '/methodPath',
        }),
      ).to.deep.equal(['/ctrlPath/methodPath']);

      expect(
        routePathFactory.create({
          ctrlPath: 'ctrlPath/',
          methodPath: 'methodPath/',
        }),
      ).to.deep.equal(['/ctrlPath/methodPath']);

      expect(
        routePathFactory.create({
          ctrlPath: 'ctrlPath/',
          methodPath: 'methodPath',
          modulePath: 'modulePath',
        }),
      ).to.deep.equal(['/modulePath/ctrlPath/methodPath']);

      expect(
        routePathFactory.create({
          ctrlPath: 'ctrlPath/',
          methodPath: 'methodPath',
          modulePath: '/modulePath',
        }),
      ).to.deep.equal(['/modulePath/ctrlPath/methodPath']);

      expect(
        routePathFactory.create({
          ctrlPath: '/ctrlPath/',
          methodPath: '/methodPath/',
          modulePath: '/modulePath/',
        }),
      ).to.deep.equal(['/modulePath/ctrlPath/methodPath']);

      expect(
        routePathFactory.create({
          ctrlPath: '/ctrlPath/',
          methodPath: '/methodPath/',
          modulePath: '/modulePath/',
          globalPrefix: 'api',
        }),
      ).to.deep.equal(['/api/modulePath/ctrlPath/methodPath']);

      expect(
        routePathFactory.create({
          ctrlPath: '/ctrlPath/',
          methodPath: '/methodPath/',
          modulePath: '/modulePath/',
          globalPrefix: '/api',
        }),
      ).to.deep.equal(['/api/modulePath/ctrlPath/methodPath']);

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
      ).to.deep.equal(['/api/modulePath/ctrlPath/methodPath']);

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
      ).to.deep.equal(['/api/v1.0.0/modulePath/ctrlPath/methodPath']);

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
      ).to.deep.equal(['/v1.0.0/modulePath/ctrlPath/methodPath']);

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
      ).to.deep.equal(['/api/v1.0.0/ctrlPath/methodPath']);

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
      ).to.deep.equal(['/api/v1.1.1/ctrlPath/methodPath']);

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
      ).to.deep.equal([
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
      ).to.deep.equal(['/api/v1.1.1', '/api/v1.2.3']);

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
      ).to.deep.equal(['/']);

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
      ).to.deep.equal(['/v1', '/']);

      expect(
        routePathFactory.create({
          ctrlPath: '',
          methodPath: '',
          globalPrefix: '',
        }),
      ).to.deep.equal(['/']);

      sinon.stub(routePathFactory, 'isExcludedFromGlobalPrefix').returns(true);
      expect(
        routePathFactory.create({
          ctrlPath: '/ctrlPath/',
          methodPath: '/',
          modulePath: '/',
          globalPrefix: '/api',
        }),
      ).to.deep.equal(['/ctrlPath']);
      sinon.restore();
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
        ).to.be.false;
      });
    });
    describe('otherwise', () => {
      describe('when route is not excluded', () => {
        it('should return false', () => {
          sinon.stub(applicationConfig, 'getGlobalPrefixOptions').returns({
            exclude: [
              {
                path: '/random',
                pathRegex: pathToRegexp('/random').regexp,
                requestMethod: RequestMethod.ALL,
              },
            ],
          });
          expect(
            routePathFactory.isExcludedFromGlobalPrefix(
              '/cats',
              RequestMethod.GET,
            ),
          ).to.be.false;
        });
      });
      describe('when route is excluded (by path)', () => {
        it('should return true', () => {
          sinon.stub(applicationConfig, 'getGlobalPrefixOptions').returns({
            exclude: [
              {
                path: '/cats',
                pathRegex: pathToRegexp('/cats').regexp,
                requestMethod: RequestMethod.ALL,
              },
            ],
          });
          expect(
            routePathFactory.isExcludedFromGlobalPrefix(
              '/cats',
              RequestMethod.GET,
            ),
          ).to.be.true;
        });

        describe('when route is excluded (by method and path)', () => {
          it('should return true', () => {
            sinon.stub(applicationConfig, 'getGlobalPrefixOptions').returns({
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
            ).to.be.true;
            expect(
              routePathFactory.isExcludedFromGlobalPrefix(
                '/cats',
                RequestMethod.POST,
              ),
            ).to.be.false;
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
          ).to.equal('');
        });
      });
      describe('and prefix is undefined', () => {
        it('should return the default prefix', () => {
          expect(
            routePathFactory.getVersionPrefix({
              type: VersioningType.URI,
            }),
          ).to.equal('v');
        });
      });
      describe('and prefix is specified', () => {
        it('should return it', () => {
          expect(
            routePathFactory.getVersionPrefix({
              type: VersioningType.URI,
              prefix: 'test',
            }),
          ).to.equal('test');
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
        ).to.equal('v');
      });
    });
  });
});
