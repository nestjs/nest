import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  RequestMethod,
} from '@nestjs/common';
import { RouteInfo } from '@nestjs/common/interfaces';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

const MIDDLEWARE_VALUE = 'middleware';

@Controller('prices')
class PricesController {
  // The path really ends in "$", which the core also uses to mark a path
  // that matches exactly
  @Get('usd$')
  usd() {
    return 'usd';
  }

  @Get('usd')
  usdLegacy() {
    return 'usd-legacy';
  }
}

for (const [name, createAdapter] of [
  ['Express', () => undefined],
  ['Fastify', () => new FastifyAdapter()],
] as const) {
  describe(`Middleware - route path ending in "$" (${name})`, () => {
    let app: INestApplication;

    const createApp = async (
      route: typeof PricesController | string | RouteInfo,
      prefix?: string,
    ) => {
      @Module({ controllers: [PricesController] })
      class TestModule {
        configure(consumer: MiddlewareConsumer) {
          consumer
            .apply((req, res, next) => res.end(MIDDLEWARE_VALUE))
            .forRoutes(route);
        }
      }

      const testingModule = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();
      const adapter = createAdapter() as FastifyAdapter | undefined;
      app = adapter
        ? testingModule.createNestApplication(adapter)
        : testingModule.createNestApplication();
      if (prefix) {
        app.setGlobalPrefix(prefix);
      }
      await app.listen(0, '127.0.0.1');
    };

    afterEach(async () => {
      await app.close();
    });

    for (const [title, route] of [
      ['the controller', PricesController],
      ['a plain string', 'prices/usd$'],
      ['a route', { path: 'prices/usd$', method: RequestMethod.GET }],
    ] as const) {
      it(`should run on the "$" route bound by ${title}`, async () => {
        await createApp(route);
        await request(app.getHttpServer())
          .get('/prices/usd$')
          .expect(200, MIDDLEWARE_VALUE);
      });
    }

    it('should not run on the route without the "$" bound by a route with it', async () => {
      await createApp({ path: 'prices/usd$', method: RequestMethod.GET });
      await request(app.getHttpServer())
        .get('/prices/usd')
        .expect(200, 'usd-legacy');
    });

    it('should run on the "$" route under a global prefix', async () => {
      await createApp(PricesController, 'api');
      await request(app.getHttpServer())
        .get('/api/prices/usd$')
        .expect(200, MIDDLEWARE_VALUE);
    });
  });
}
