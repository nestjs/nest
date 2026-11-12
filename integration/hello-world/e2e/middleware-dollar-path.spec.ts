import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  RequestMethod,
} from '@nestjs/common';
import type { RouteInfo } from '@nestjs/common/internal';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

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

describe.each([
  ['Express', () => undefined],
  ['Fastify', () => new FastifyAdapter()],
  ['node', () => new NodeAdapter()],
])('Middleware - route path ending in "$" (%s)', (_, createAdapter) => {
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
    const adapter = createAdapter();
    app = adapter
      ? testingModule.createNestApplication(adapter)
      : testingModule.createNestApplication();
    if (prefix) {
      app.setGlobalPrefix(prefix);
    }
    await listenOnLoopback(app);
  };

  afterEach(async () => {
    await app.close();
  });

  it.each([
    ['the controller', PricesController],
    ['a plain string', 'prices/usd$'],
    ['a route', { path: 'prices/usd$', method: RequestMethod.GET }],
  ] as const)('should run on the "$" route bound by %s', async (__, route) => {
    await createApp(route);
    await request(app.getHttpServer())
      .get('/prices/usd$')
      .expect(200, MIDDLEWARE_VALUE);
  });

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
