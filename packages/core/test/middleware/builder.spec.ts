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
          method: -1 as any,
        },
      ]);
    });
  });
});
