import {
  Controller,
  Get,
  Injectable,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import request from 'supertest';

describe('Middleware before init (NodeAdapter)', () => {
  let app: NestNodeApplication;

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

  describe('should apply middleware registered before init', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();

      app = module.createNestApplication<NestNodeApplication>(
        new NodeAdapter(),
      );

      // Register middleware before init
      app.use((req, res, next) => {
        res.setHeader('x-global-middleware', 'applied');
        next();
      });

      await app.init();
    });

    it('should apply the middleware registered before init', async () => {
      const { headers } = await request(app.getHttpServer())
        .get('/test')
        .expect(200, { data: 'test_data' });
      // Verify both module-level and global middleware were applied
      expect(headers['x-middleware']).toBe('applied');
      expect(headers['x-global-middleware']).toBe('applied');
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

      app = module.createNestApplication<NestNodeApplication>(
        new NodeAdapter(),
      );

      // Initialize app first
      await app.init();

      // Now middleware registration should work
      app.use((req, res, next) => {
        res.setHeader('x-global-middleware', 'applied');
        next();
      });
    });

    it('should register middleware successfully after init', () => {
      return request(app.getHttpServer())
        .get('/test')
        .expect(200, { data: 'test_data' });
    });

    afterEach(async () => {
      await app.close();
    });
  });
});
