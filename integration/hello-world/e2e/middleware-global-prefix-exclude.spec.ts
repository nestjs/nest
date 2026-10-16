import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  Post,
  RequestMethod,
} from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

const RETURN_VALUE = 'test';
const MIDDLEWARE_VALUE = 'middleware';

@Controller()
class HealthController {
  @Get('health')
  getHealth() {
    return RETURN_VALUE;
  }

  @Post('health')
  postHealth() {
    return RETURN_VALUE;
  }
}

@Controller('users')
class UsersController {
  @Get('me')
  findMe() {
    return RETURN_VALUE;
  }

  @Get(':id')
  findOne() {
    return RETURN_VALUE;
  }
}

@Module({
  controllers: [HealthController, UsersController],
})
class TestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.end(MIDDLEWARE_VALUE))
      .forRoutes('health', { path: 'users/:id', method: RequestMethod.GET });
  }
}

for (const [name, createAdapter] of [
  ['Express', () => undefined],
  ['Fastify', () => new FastifyAdapter()],
] as const) {
  describe(`Middleware - routes excluded from the global prefix (${name})`, () => {
    let app: INestApplication;

    beforeEach(async () => {
      const testingModule = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();
      const adapter = createAdapter();
      app = adapter
        ? testingModule.createNestApplication(adapter)
        : testingModule.createNestApplication();
      app.setGlobalPrefix('api', {
        exclude: [{ path: 'health', method: RequestMethod.GET }, 'users/me'],
      });
      await app.init();
      if (adapter) {
        await adapter.getInstance().ready();
      }
    });

    afterEach(async () => {
      await app.close();
    });

    it(`forRoutes('health') should run on "GET /health" excluded for GET`, async () => {
      await request(app.getHttpServer())
        .get('/health')
        .expect(200, MIDDLEWARE_VALUE);
      await request(app.getHttpServer())
        .post('/api/health')
        .expect(200, MIDDLEWARE_VALUE);
      await request(app.getHttpServer()).post('/health').expect(404);
    });

    it(`forRoutes('users/:id') should run on "/users/me" excluded from the prefix`, async () => {
      await request(app.getHttpServer())
        .get('/api/users/1')
        .expect(200, MIDDLEWARE_VALUE);
      await request(app.getHttpServer())
        .get('/users/me')
        .expect(200, MIDDLEWARE_VALUE);
    });
  });
}

@Controller('reports')
class ReportsController {
  @Get()
  findAll() {
    return RETURN_VALUE;
  }

  @Get(':id')
  findOne() {
    return RETURN_VALUE;
  }
}

for (const [name, createAdapter] of [
  ['Express', () => undefined],
  ['Fastify', () => new FastifyAdapter()],
] as const) {
  describe(`Middleware - controller root excluded from the global prefix by a wildcard (${name})`, () => {
    let app: INestApplication;

    const createApp = async (route: string) => {
      @Module({
        controllers: [ReportsController],
      })
      class ReportsModule {
        configure(consumer: MiddlewareConsumer) {
          consumer
            .apply((req, res, next) => res.end(MIDDLEWARE_VALUE))
            .forRoutes(route);
        }
      }

      const testingModule = await Test.createTestingModule({
        imports: [ReportsModule],
      }).compile();
      const adapter = createAdapter();
      app = adapter
        ? testingModule.createNestApplication(adapter)
        : testingModule.createNestApplication();
      // The router tests the root route of the controller as "/reports/",
      // which the exclusion matches, and serves it at "/reports"
      app.setGlobalPrefix('api', { exclude: ['reports/{*path}'] });
      await app.init();
      if (adapter) {
        await adapter.getInstance().ready();
      }
    };

    afterEach(async () => {
      await app.close();
    });

    for (const route of ['{*path}', 'reports']) {
      it(`forRoutes('${route}') should run on "/reports"`, async () => {
        await createApp(route);
        await request(app.getHttpServer())
          .get('/reports')
          .expect(200, MIDDLEWARE_VALUE);
      });
    }
  });
}
