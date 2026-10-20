import {
  Controller,
  Get,
  Injectable,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';

describe('Middleware before init (FastifyAdapter)', () => {
  let app: NestFastifyApplication;

  @Injectable()
  class TestService {
    getData(): string {
      return 'test_data';
    }
  }

  @Controller()
  class TestController {
    constructor(private readonly testService: TestService) {}

    @Get('test')
    test() {
      return { data: this.testService.getData() };
    }

    @Get('health')
    health() {
      return { status: 'ok' };
    }
  }

  @Module({
    controllers: [TestController],
    providers: [TestService],
  })
  class TestModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
      consumer
        .apply((req, res, next) => {
          res.setHeader('x-middleware', 'applied');
          next();
        })
        .forRoutes('*');
    }
  }

  describe('should queue middleware when registered before init', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();

      app = module.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      // Register middleware before init - should be queued
      app.use((req, res, next) => {
        res.setHeader('x-global-middleware', 'applied');
        next();
      });

      // Now init the app - queued middleware should be registered
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
    });

    it('should apply queued middleware after init', () => {
      return app
        .inject({
          method: 'GET',
          url: '/test',
        })
        .then(({ statusCode, payload, headers }) => {
          expect(statusCode).toBe(200);
          expect(JSON.parse(payload)).toEqual({ data: 'test_data' });
          // Verify both module-level and global middleware were applied
          expect(headers['x-middleware']).toBe('applied');
          expect(headers['x-global-middleware']).toBe('applied');
        });
    });

    afterEach(async () => {
      await app.close();
    });
  });

  describe('should work when app is initialized before middleware registration', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();

      app = module.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      // Initialize app first
      await app.init();

      // Now middleware registration should work
      app.use((req, res, next) => {
        res.setHeader('x-global-middleware', 'applied');
        next();
      });

      await app.getHttpAdapter().getInstance().ready();
    });

    it('should register middleware successfully after init', () => {
      return app
        .inject({
          method: 'GET',
          url: '/test',
        })
        .then(({ statusCode, payload }) => {
          expect(statusCode).toBe(200);
          expect(JSON.parse(payload)).toEqual({ data: 'test_data' });
        });
    });

    afterEach(async () => {
      await app.close();
    });
  });

  // `NestFactory.create()` registers middie before `main.ts` runs, and middie
  // gives the context of a plugin registered then a copy of the middleware
  // of the root, without the module middleware `app.init()` registers later
  describe.each([
    [
      'NestFactory.create()',
      () =>
        NestFactory.create<NestFastifyApplication>(
          TestModule,
          new FastifyAdapter(),
          { logger: false },
        ),
    ],
    [
      'Test.createNestApplication()',
      async () =>
        (
          await Test.createTestingModule({ imports: [TestModule] }).compile()
        ).createNestApplication<NestFastifyApplication>(new FastifyAdapter()),
    ],
  ])(
    'should apply module middleware to a plugin registered before init (%s)',
    (_, createApp) => {
      beforeEach(async () => {
        app = await createApp();
        await app.register(
          async instance => {
            instance.get('/jobs', async () => 'plugin_data');
            await instance.register(
              async nested => {
                nested.get('/nested', async () => 'nested_data');
              },
              { prefix: '/nested' },
            );
          },
          { prefix: '/queues' },
        );
        await app.init();
      });

      it.each([
        ['/queues/jobs', 'plugin_data'],
        ['/queues/nested/nested', 'nested_data'],
      ])('should apply it to %s', async (url, data) => {
        const { statusCode, payload, headers } = await app.inject({
          method: 'GET',
          url,
        });

        expect(statusCode).toBe(200);
        expect(payload).toBe(data);
        expect(headers['x-middleware']).toBe('applied');
      });

      afterEach(async () => {
        await app.close();
      });
    },
  );
});
