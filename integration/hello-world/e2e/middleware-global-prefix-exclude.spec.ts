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
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

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

describe.each([
  ['Express', () => undefined],
  ['Fastify', () => new FastifyAdapter()],
])(
  'Middleware - routes excluded from the global prefix (%s)',
  (_, createAdapter) => {
    let app: INestApplication;

    beforeEach(async () => {
      app = (
        await Test.createTestingModule({ imports: [TestModule] }).compile()
      ).createNestApplication(createAdapter());
      app.setGlobalPrefix('api', {
        exclude: [{ path: 'health', method: RequestMethod.GET }, 'users/me'],
      });
      await listenOnLoopback(app);
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
  },
);
