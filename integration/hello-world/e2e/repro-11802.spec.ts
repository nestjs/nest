import {
  Controller,
  Get,
  Injectable,
  MiddlewareConsumer,
  Module,
  NestMiddleware,
  NestModule,
} from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { FastifyInstance } from 'fastify';

describe('Middleware + Fastify plugin registered with a prefix (#11802 repro)', () => {
  let app: NestFastifyApplication;
  let middlewareHits = 0;

  @Injectable()
  class CountingMiddleware implements NestMiddleware {
    use(req: any, res: any, next: () => void) {
      middlewareHits += 1;
      next();
    }
  }

  // A minimal stand-in for a third-party plugin like bull-board: a PLAIN
  // (not fastify-plugin-wrapped) plugin function that registers its own
  // routes under a prefix via fastify.register(). Not wrapping with `fp()`
  // is deliberate and important - `fp()` breaks Fastify's encapsulation,
  // which would skip creating the child instance this bug is actually
  // about. Real plugins like bull-board register this way too.
  function thirdPartyPlugin(
    instance: FastifyInstance,
    _opts: unknown,
    next: (err?: Error) => void,
  ) {
    instance.get('/', async () => 'plugin-root');
    next();
  }

  @Controller()
  class RootController {
    @Get('other')
    other() {
      return 'other';
    }
  }

  @Module({ controllers: [RootController] })
  class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
      consumer.apply(CountingMiddleware).forRoutes('/queues');
    }
  }

  beforeEach(async () => {
    middlewareHits = 0;
    app = (
      await Test.createTestingModule({ imports: [AppModule] }).compile()
    ).createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    // Registered AFTER app.init(), matching how a real module (e.g.
    // bull-board's BullBoardModule) registers its Fastify plugin from an
    // injected HttpAdapterHost inside a provider - by that point Nest's own
    // middleware setup (and @fastify/middie's registration) has already run.
    await app.init();

    app
      .getHttpAdapter()
      .getInstance()
      .register(thirdPartyPlugin, { prefix: '/queues' });

    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('runs the middleware for a route registered inside the plugin', async () => {
    const response = await app.inject({ method: 'GET', url: '/queues' });
    expect(response.statusCode).to.equal(200);
    expect(response.payload).to.equal('plugin-root');
    expect(middlewareHits).to.equal(1);
  });

  it('still runs the middleware for a normal Nest route under the same prefix-like path', async () => {
    const response = await app.inject({ method: 'GET', url: '/other' });
    expect(response.statusCode).to.equal(200);
  });
});
