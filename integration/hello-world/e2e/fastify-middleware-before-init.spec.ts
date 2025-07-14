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

  describe('should work when middleware is registered before init', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();

      app = module.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      // This should work without throwing an error
      // Previously this would throw: TypeError: this.instance.use is not a function
      app.use((req, res, next) => {
        req.headers['x-global-middleware'] = 'applied';
        next();
      });

      await app.init();
      await app.getHttpAdapter().getInstance().ready();
    });

    it('should handle middleware registration before init', () => {
      return app
        .inject({
          method: 'GET',
          url: '/health',
        })
        .then(({ statusCode, payload }) => {
          expect(statusCode).to.equal(200);
          expect(JSON.parse(payload)).to.deep.equal({ status: 'ok' });
        });
    });

    it('should process global middleware', () => {
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

  describe('should work with multiple middleware registrations before init', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();

      app = module.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      // Register multiple middlewares before init
      app.use((req, res, next) => {
        req.headers['x-first-middleware'] = 'applied';
        next();
      });

      app.use('/test', (req, res, next) => {
        req.headers['x-scoped-middleware'] = 'applied';
        next();
      });

      await app.init();
      await app.getHttpAdapter().getInstance().ready();
    });

    it('should handle multiple middleware registrations', () => {
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
