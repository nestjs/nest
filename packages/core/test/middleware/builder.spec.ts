import { expect } from 'chai';
import {
  Controller,
  Delete,
  Get,
  Head,
  Options,
  Patch,
  Post,
  Put,
  RequestMethod,
  Version,
  VersioningType,
} from '../../../common';
import { MiddlewareConfigProxy } from '../../../common/interfaces';
import { ApplicationConfig } from '../../application-config';
import { NestContainer } from '../../injector/container';
import { MiddlewareBuilder } from '../../middleware/builder';
import { RouteInfoPathExtractor } from '../../middleware/route-info-path-extractor';
import { RoutesMapper } from '../../middleware/routes-mapper';
import { mapToExcludeRoute } from '../../middleware/utils';
import { NoopHttpAdapter } from './../utils/noop-adapter.spec';

describe('MiddlewareBuilder', () => {
  let builder: MiddlewareBuilder;

  beforeEach(() => {
    const container = new NestContainer();
    const appConfig = new ApplicationConfig();
    appConfig.enableVersioning({ type: VersioningType.URI });
    builder = new MiddlewareBuilder(
      new RoutesMapper(container, appConfig),
      new NoopHttpAdapter({}),
      new RouteInfoPathExtractor(appConfig),
    );
  });
  describe('apply', () => {
    it('should return configuration proxy', () => {
      const configProxy = builder.apply([]);
      const metatype = (MiddlewareBuilder as any).ConfigProxy;
      expect(configProxy instanceof metatype).to.be.true;
    });

    describe('configuration proxy', () => {
      describe('when "forRoutes()" called', () => {
        let configProxy: MiddlewareConfigProxy;
        beforeEach(() => {
          configProxy = builder.apply([]);
        });
        @Controller('path')
        class Test {
          @Get('route')
          public getAll() {}

          @Version('1')
          @Get('versioned')
          public getAllVersioned() {}
        }
        const route = { path: '/test', method: RequestMethod.GET };

        it('should store configuration passed as argument', () => {
          configProxy.forRoutes(route, Test);

          expect(builder.build()).to.deep.equal([
            {
              middleware: [],
              forRoutes: [
                {
                  method: RequestMethod.GET,
                  path: route.path,
                },
                {
                  method: RequestMethod.GET,
                  path: '/path/route',
                },
                {
                  method: RequestMethod.GET,
                  path: '/path/versioned',
                  version: '1',
                },
              ],
            },
          ]);
        });

        @Controller('users')
        class UsersController {
          @Head('rsvp')
          hRsvp() {}

          @Options('rsvp')
          oRsvp() {}

          @Get('rsvp')
          gRsvp() {}

          @Post('rsvp')
          pRsvp() {}

          @Put('rsvp')
          puRsvp() {}

          @Patch('rsvp')
          ptRsvp() {}

          @Delete('rsvp')
          dRsvp() {}

          @Post()
          create() {}

          @Get()
          findAll() {}

          @Get(':id')
          findOne() {}

          @Patch(':id')
          update() {}

          @Delete(':id')
          remove() {}
        }

        it('should remove overlapping routes', () => {
          configProxy.forRoutes(UsersController);

          expect(builder.build()).to.deep.equal([
            {
              middleware: [],
              forRoutes: [
                {
                  method: RequestMethod.HEAD,
                  path: '/users/rsvp',
                },
                {
                  method: RequestMethod.OPTIONS,
                  path: '/users/rsvp',
                },
                {
                  method: RequestMethod.POST,
                  path: '/users/rsvp',
                },
                {
                  method: RequestMethod.PUT,
                  path: '/users/rsvp',
                },
                {
                  method: RequestMethod.POST,
                  path: '/users/',
                },
                {
                  method: RequestMethod.GET,
                  path: '/users/',
                },
                {
                  method: RequestMethod.GET,
                  path: '/users/:id',
                },
                {
                  method: RequestMethod.PATCH,
                  path: '/users/:id',
                },
                {
                  method: RequestMethod.DELETE,
                  path: '/users/:id',
                },
                // Overlapping:
                // {
                //   method: RequestMethod.GET,
                //   path: '/users/rsvp',
                // },
                // {
                //   method: RequestMethod.PATCH,
                //   path: '/users/rsvp',
                // },
                // {
                //   method: RequestMethod.DELETE,
                //   path: '/users/rsvp',
                // },
              ],
            },
          ]);
        });

        it('should not remove a route the parameterized one is not mounted on', () => {
          const routes = [
            { path: '/docs/:id.json', method: RequestMethod.GET },
            { path: '/docs/admin', method: RequestMethod.GET },
            { path: '/files/:id', method: RequestMethod.GET },
            { path: '/files/{*path}', method: RequestMethod.GET },
            { path: '/files/*path', method: RequestMethod.GET },
            { path: '/projects/:id/files/*', method: RequestMethod.GET },
            { path: '/projects/:id/files', method: RequestMethod.GET },
            { path: '/reports/:id', method: RequestMethod.GET },
            { path: '/reports/:slug', method: RequestMethod.GET },
          ];
          configProxy.forRoutes(...routes);

          expect(builder.build()[0].forRoutes).to.deep.equal(routes);
        });

        @Controller('invoices')
        class InvoicesController {
          @Get()
          findAll() {}
        }

        for (const tail of ['{*page}', '*', '{:page}']) {
          it(`should not remove the root route of a controller next to ":tenant/${tail}"`, () => {
            // The root route is mounted on "/invoices/" and served at
            // "/invoices", which the parameterized route only matches with
            // the trailing slash
            @Controller(':tenant')
            class TenantPagesController {
              @Get(tail)
              findPage() {}
            }
            configProxy.forRoutes(InvoicesController, TenantPagesController);

            expect(
              builder.build()[0].forRoutes.map(({ path }: any) => path),
            ).to.deep.equal(['/invoices/', `/:tenant/${tail}`]);
          });
        }

        it('should not remove the root route of a controller next to an optional parameter of its own', () => {
          @Controller('a')
          class AController {
            @Get()
            findAll() {}

            @Get('{:id}')
            findOne() {}
          }
          configProxy.forRoutes(AController);

          expect(builder.build()[0].forRoutes).to.deep.equal([
            { path: '/a/', method: RequestMethod.GET },
            { path: '/a/{:id}', method: RequestMethod.GET },
          ]);
        });

        it('should remove the root route of a controller covered by the root route of a parameterized one', () => {
          @Controller(':tenant')
          class TenantController {
            @Get()
            findOne() {}
          }
          configProxy.forRoutes(InvoicesController, TenantController);

          expect(builder.build()[0].forRoutes).to.deep.equal([
            { path: '/:tenant/', method: RequestMethod.GET },
          ]);
        });

        it('should not remove a route of another version than the parameterized one', () => {
          const routes = [
            { path: '/accounts/:id', method: RequestMethod.GET, version: '1' },
            { path: '/accounts/me', method: RequestMethod.GET, version: '2' },
            {
              path: '/accounts/:uuid',
              method: RequestMethod.GET,
              version: '3',
            },
          ];
          configProxy.forRoutes(...routes);

          expect(builder.build()[0].forRoutes).to.deep.equal(routes);
        });

        it('should not remove a route excluded from the global prefix, unlike the parameterized one', () => {
          const appConfig = new ApplicationConfig();
          appConfig.setGlobalPrefix('api');
          appConfig.setGlobalPrefixOptions({
            exclude: mapToExcludeRoute(['users/me']),
          });
          builder = new MiddlewareBuilder(
            new RoutesMapper(new NestContainer(), appConfig),
            new NoopHttpAdapter({}),
            new RouteInfoPathExtractor(appConfig),
          );
          const routes = [
            { path: '/users/:id', method: RequestMethod.GET },
            { path: '/users/me', method: RequestMethod.GET },
          ];
          builder.apply([]).forRoutes(...routes);

          expect(builder.build()[0].forRoutes).to.deep.equal(routes);
        });

        it('should remove every route overlapping the same parameterized one', () => {
          // The parameterized route's regex is reused for each candidate, so a
          // stateful (global) regex would leave `lastIndex` past the end of the
          // previous match and let every other concrete route through. #17334
          configProxy.forRoutes(
            { path: 'cats/:id', method: RequestMethod.GET },
            { path: 'cats/1', method: RequestMethod.GET },
            { path: 'cats/2', method: RequestMethod.GET },
            { path: 'cats/3', method: RequestMethod.GET },
          );

          expect(builder.build()).to.deep.equal([
            {
              middleware: [],
              forRoutes: [
                {
                  method: RequestMethod.GET,
                  path: '/cats/:id',
                },
              ],
            },
          ]);
        });
      });
    });
  });

  describe('exclude', () => {
    it('should map string to RouteInfo', () => {
      const path = '/test';
      const proxy: any = builder.apply().exclude(path);

      expect(proxy.getExcludedRoutes()).to.be.eql([
        {
          path,
          method: -1,
        },
      ]);
    });

    it('should also exclude the routes excluded from the global prefix that a route covers', () => {
      const appConfig = new ApplicationConfig();
      appConfig.setGlobalPrefix('api');
      appConfig.setGlobalPrefixOptions({
        exclude: mapToExcludeRoute(['health', 'health/ready']),
      });
      builder = new MiddlewareBuilder(
        new RoutesMapper(new NestContainer(), appConfig),
        new NoopHttpAdapter({}),
        new RouteInfoPathExtractor(appConfig),
      );
      const proxy: any = builder.apply().exclude('health/{*path}', 'health');

      expect(proxy.getExcludedRoutes()).to.deep.equal([
        { path: '/api/health/{*path}', method: -1 },
        { path: '/health/ready', method: -1 },
        { path: '/health', method: -1 },
      ]);
    });

    it('should not exclude the parent route of a wildcard, excluded from the global prefix with a trailing slash', () => {
      const appConfig = new ApplicationConfig();
      appConfig.setGlobalPrefix('api');
      appConfig.setGlobalPrefixOptions({
        exclude: mapToExcludeRoute(['webhooks/']),
      });
      builder = new MiddlewareBuilder(
        new RoutesMapper(new NestContainer(), appConfig),
        new NoopHttpAdapter({}),
        new RouteInfoPathExtractor(appConfig),
      );
      const proxy: any = builder.apply().exclude('webhooks/{*path}');

      expect(proxy.getExcludedRoutes()).to.deep.equal([
        { path: '/api/webhooks/{*path}', method: -1 },
      ]);
    });

    it('should match the routes excluded from the global prefix with the case sensitivity of the router', () => {
      const appConfig = new ApplicationConfig();
      appConfig.setGlobalPrefix('api');
      appConfig.setGlobalPrefixOptions({
        exclude: mapToExcludeRoute(['health/ready']),
      });
      const createBuilder = (caseSensitive: boolean) => {
        const httpAdapter = Object.assign(new NoopHttpAdapter({}), {
          getRouteMatchingOptions: () => ({
            caseSensitive,
            ignoreTrailingSlash: false,
          }),
        });
        return new MiddlewareBuilder(
          new RoutesMapper(new NestContainer(), appConfig),
          httpAdapter,
          new RouteInfoPathExtractor(appConfig),
        );
      };

      const sensitive: any = createBuilder(true)
        .apply()
        .exclude('HEALTH/:check');
      expect(sensitive.getExcludedRoutes()).to.deep.equal([
        { path: '/api/HEALTH/:check', method: -1 },
      ]);

      const insensitive: any = createBuilder(false)
        .apply()
        .exclude('HEALTH/:check');
      expect(insensitive.getExcludedRoutes()).to.deep.equal([
        { path: '/api/HEALTH/:check', method: -1 },
        { path: '/health/ready', method: -1 },
      ]);
    });
  });
});
