import {
  Controller,
  Get,
  Injectable,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';

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
          expect(statusCode).to.equal(200);
          expect(JSON.parse(payload)).to.deep.equal({ data: 'test_data' });
          // Verify both module-level and global middleware were applied
          expect(headers['x-middleware']).to.equal('applied');
          expect(headers['x-global-middleware']).to.equal('applied');
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
          expect(statusCode).to.equal(200);
          expect(JSON.parse(payload)).to.deep.equal({ data: 'test_data' });
        });
    });

    afterEach(async () => {
      await app.close();
    });
  });
});
