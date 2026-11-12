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
      ).to.eql([
        { path: '/api/health/{*path}', method: -1 },
        { path: '/health/ready', method: -1 },
      ]);

      expect(
        routeInfoPathExtractor.extractExclusionsFrom({
          path: '/health/(.*)',
          method: -1 as RequestMethod,
        }),
      ).to.eql([
        { path: '/api/health/(.*)', method: -1 },
        { path: '/health/ready', method: -1 },
      ]);

      expect(
        routeInfoPathExtractor.extractExclusionsFrom({
          path: '/webhooks/:provider',
          method: RequestMethod.ALL,
        }),
      ).to.eql([
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
      ).to.eql([
        { path: '/api/webhooks/:provider', method: RequestMethod.GET },
      ]);
    });

    it(`should return the root route of a controller excluded by an optional wildcard`, () => {
      expect(
        routeInfoPathExtractor.extractExclusionsFrom({
          path: '/reports',
          method: -1 as RequestMethod,
        }),
      ).to.eql([
        { path: '/api/reports', method: -1 },
        { path: '/reports/', method: -1 },
      ]);
    });

    it(`should match the excluded routes case-sensitively unless told otherwise`, () => {
      const route = { path: '/HEALTH/:check', method: -1 as RequestMethod };

      expect(routeInfoPathExtractor.extractExclusionsFrom(route)).to.eql([
        { path: '/api/HEALTH/:check', method: -1 },
      ]);
      expect(
        routeInfoPathExtractor.extractExclusionsFrom(route, {
          caseSensitive: false,
        }),
      ).to.eql([
        { path: '/api/HEALTH/:check', method: -1 },
        { path: '/health/ready', method: -1 },
      ]);
    });

    it(`should compare an excluded route written with a trailing slash as the router serves it`, () => {
      const appConfig = new ApplicationConfig();
      appConfig.setGlobalPrefix('api');
      appConfig.setGlobalPrefixOptions({
        exclude: mapToExcludeRoute(['webhooks/', 'orders/archive/']),
      });
      const extractor = new RouteInfoPathExtractor(appConfig);

      // "/webhooks/" is served at "/webhooks", which the wildcard does not
      // match
      for (const path of [
        '/webhooks/{*path}',
        '/webhooks/*',
        '/webhooks/(.*)',
        '/webhooks/{:id}',
      ]) {
        expect(
          extractor.extractExclusionsFrom({
            path,
            method: -1 as RequestMethod,
          }),
        ).to.eql([{ path: '/api' + path, method: -1 }]);
      }
      // A route written with a trailing slash is served without it too
      expect(
        extractor.extractExclusionsFrom({
          path: '/orders/:id/',
          method: -1 as RequestMethod,
        }),
      ).to.eql([
        { path: '/api/orders/:id/', method: -1 },
        { path: '/orders/archive/', method: -1 },
      ]);
      // forRoutes() mounts the middleware on more paths with it
      expect(
        extractor.extractExcludedRoutesCoveredBy({
          path: '/webhooks/{*path}',
          method: -1 as RequestMethod,
        }),
      ).to.eql([{ path: '/webhooks/', method: -1 }]);
    });

    it(`should only return the route itself when it is excluded or a wildcard`, () => {
      expect(
        routeInfoPathExtractor.extractExclusionsFrom({
          path: '/health/ready',
          method: -1 as RequestMethod,
        }),
      ).to.eql([{ path: '/health/ready', method: -1 }]);

      expect(
        routeInfoPathExtractor.extractExclusionsFrom({
          path: '/{*path}',
          method: -1 as RequestMethod,
        }),
      ).to.eql([{ path: '/{*path}', method: -1 }]);
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

describe('RouteInfoPathExtractor - controller routes on the other side of the global prefix', () => {
  const createExtractor = (
    exclude: Parameters<typeof mapToExcludeRoute>[0],
    controllerRoutes: {
      path: string;
      method: RequestMethod;
      version?: string;
    }[],
    configure: (config: ApplicationConfig) => void = () => {},
  ) => {
    const appConfig = new ApplicationConfig();
    appConfig.setGlobalPrefix('api');
    appConfig.setGlobalPrefixOptions({ exclude: mapToExcludeRoute(exclude) });
    configure(appConfig);
    return new RouteInfoPathExtractor(appConfig, () => controllerRoutes);
  };
  const filesRoutes = [
    { path: '/files/:name', method: RequestMethod.GET },
    { path: '/files/:name/versions', method: RequestMethod.GET },
  ];

  it('should return the prefixed routes a route that reads as excluded covers', () => {
    const extractor = createExtractor(['files/:name'], filesRoutes);

    expect(
      extractor.extractControllerRoutesCoveredBy({
        path: '/files/*path',
        method: -1 as RequestMethod,
      }),
    ).to.deep.equal([
      { path: '/files/:name/versions', method: RequestMethod.GET },
    ]);
    // Mounted on the side the router serves it at
    expect(
      extractor.extractPathsFrom({
        path: '/files/:name/versions',
        method: RequestMethod.GET,
      }),
    ).to.deep.equal(['/api/files/:name/versions']);
  });

  it('should return the excluded routes a route covers, of a method it is mounted for', () => {
    const extractor = createExtractor(
      [
        'files/:name/versions',
        { path: 'users/:id', method: RequestMethod.GET },
      ],
      [...filesRoutes, { path: '/users/:id', method: RequestMethod.GET }],
    );

    expect(
      extractor.extractControllerRoutesCoveredBy({
        path: '/files/*path',
        method: -1 as RequestMethod,
      }),
    ).to.deep.equal([
      { path: '/files/:name/versions', method: RequestMethod.GET },
    ]);
    expect(
      extractor.extractControllerRoutesCoveredBy({
        path: '/users/:id',
        method: RequestMethod.ALL,
      }),
    ).to.deep.equal([{ path: '/users/:id', method: RequestMethod.GET }]);
    expect(
      extractor.extractControllerRoutesCoveredBy({
        path: '/users/:id',
        method: RequestMethod.POST,
      }),
    ).to.deep.equal([]);
  });

  it('should match a plain string on the routes below it, and a route on its own path only', () => {
    const extractor = createExtractor(
      ['users/me'],
      [
        { path: '/users/me', method: RequestMethod.GET },
        { path: '/users/me/settings', method: RequestMethod.GET },
        { path: '/users/:id', method: RequestMethod.GET },
      ],
    );

    expect(
      extractor.extractControllerRoutesCoveredBy({
        path: '/users',
        method: -1 as RequestMethod,
      }),
    ).to.deep.equal([{ path: '/users/me', method: RequestMethod.GET }]);
    expect(
      extractor.extractControllerRoutesCoveredBy({
        path: '/users',
        method: RequestMethod.GET,
      }),
    ).to.deep.equal([]);
  });

  it('should only return the routes of the versions a route is mounted under', () => {
    const extractor = createExtractor(
      ['files/:name/versions'],
      [
        { ...filesRoutes[1], version: '1' },
        { ...filesRoutes[1], version: '2' },
      ],
      config =>
        config.enableVersioning({
          type: VersioningType.URI,
          defaultVersion: '1',
        }),
    );

    expect(
      extractor.extractControllerRoutesCoveredBy({
        path: '/files/*path',
        method: -1 as RequestMethod,
      }),
    ).to.deep.equal([
      {
        path: '/files/:name/versions',
        method: RequestMethod.GET,
        version: '1',
      },
    ]);
  });

  it('should mount a wildcard on the excluded routes, under their own version', () => {
    const extractor = createExtractor(
      ['documents/:id'],
      [
        { path: '/documents/*path', method: RequestMethod.GET, version: '1' },
        { path: '/documents/*path', method: RequestMethod.GET, version: '2' },
        { path: '/users/:id', method: RequestMethod.GET, version: '1' },
      ],
      config =>
        config.enableVersioning({
          type: VersioningType.URI,
          defaultVersion: '1',
        }),
    );

    const paths = extractor.extractPathsFrom({
      path: '/{*splat}',
      method: -1 as RequestMethod,
    });
    expect(paths).to.include('/v1/documents/*path');
    expect(paths).to.include('/v2/documents/*path');
    expect(paths).not.to.include('/v1/users/:id');

    expect(
      extractor.extractPathsFrom({
        path: '/{*splat}',
        method: -1 as RequestMethod,
        version: '2',
      }),
    ).not.to.include('/v1/documents/*path');
  });

  it('should mount a route the adapters cannot mount on the paths below its static segments', () => {
    const extractor = createExtractor(
      ['files/:id'],
      [{ path: '/files/:id?', method: RequestMethod.GET }],
    );

    expect(
      extractor.extractPathsFrom({
        path: '/{*splat}',
        method: -1 as RequestMethod,
      }),
    ).to.include('/files{/*path}');
  });

  it('should not return anything without a global prefix or controller routes', () => {
    const appConfig = new ApplicationConfig();
    appConfig.setGlobalPrefixOptions({
      exclude: mapToExcludeRoute(['files/:name']),
    });
    expect(
      new RouteInfoPathExtractor(
        appConfig,
        () => filesRoutes,
      ).extractControllerRoutesCoveredBy({
        path: '/files/*path',
        method: -1 as RequestMethod,
      }),
    ).to.deep.equal([]);
    expect(
      createExtractor(['files/:name'], []).extractControllerRoutesCoveredBy({
        path: '/files/*path',
        method: -1 as RequestMethod,
      }),
    ).to.deep.equal([]);
  });
});

describe('RouteInfoPathExtractor - paths ending in an optional segment', () => {
  it('should mount the root route of a controller without the slash after an optional segment', () => {
    const extractor = new RouteInfoPathExtractor(new ApplicationConfig());
    const mount = (path: string) =>
      extractor.extractPathsFrom({ path, method: RequestMethod.GET });

    expect(mount('/proxy/*/')).to.deep.equal(['/proxy/*']);
    expect(mount('/proxy/(.*)/')).to.deep.equal(['/proxy/(.*)']);
    expect(mount('/files/{*path}/')).to.deep.equal(['/files/{*path}']);
    expect(mount('/items/{:id}/')).to.deep.equal(['/items/{:id}']);
    // The slash is kept where nothing optional comes before it
    expect(mount('/invoices/')).to.deep.equal(['/invoices/']);
    expect(mount('/users/:id/')).to.deep.equal(['/users/:id/']);
    expect(mount('/files/*path/')).to.deep.equal(['/files/*path/']);
  });
});

describe('RouteInfoPathExtractor - paths ending in "$"', () => {
  it('should add a slash to a route path that ends in "$", but not to the exact-match mark', () => {
    const appConfig = new ApplicationConfig();
    appConfig.setGlobalPrefix('api');
    appConfig.setGlobalPrefixOptions({
      exclude: mapToExcludeRoute(['health$']),
    });
    const extractor = new RouteInfoPathExtractor(appConfig);

    expect(
      extractor.extractPathsFrom({
        path: '/prices/usd$',
        method: RequestMethod.GET,
      }),
    ).to.deep.equal(['/api/prices/usd$/']);
    expect(
      extractor.extractPathsFrom({
        path: '/{*path}',
        method: -1 as RequestMethod,
      }),
    ).to.deep.equal(['/api$', '/api/{*path}', '/health$/']);
  });
});
