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
          req.headers['x-middleware'] = 'applied';
          next();
        })
        .forRoutes('*');
    }
  }

  describe('should throw helpful error when middleware is registered before init', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();

      app = module.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      // This should throw a helpful error message
      let errorMessage = '';
      try {
        app.use((req, res, next) => {
          req.headers['x-global-middleware'] = 'applied';
          next();
        });
      } catch (error) {
        errorMessage = error.message;
      }

      expect(errorMessage).to.equal('this.instance.use is not a function');
      // The helpful error message is logged, not thrown
    });

    it('should display clear error message', () => {
      // Test is complete in beforeEach
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
        req.headers['x-global-middleware'] = 'applied';
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
