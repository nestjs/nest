import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  Post,
  RequestMethod,
} from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { ApplicationModule } from '../src/app.module';

const RETURN_VALUE = 'test';
const MIDDLEWARE_VALUE = 'middleware';

@Controller()
class TestController {
  @Get('test')
  test() {
    return RETURN_VALUE;
  }

  @Get('test2')
  test2() {
    return RETURN_VALUE;
  }

  @Get('middleware')
  middleware() {
    return RETURN_VALUE;
  }

  @Post('middleware')
  noMiddleware() {
    return RETURN_VALUE;
  }

  @Get('wildcard/overview')
  testOverview() {
    return RETURN_VALUE;
  }

  @Get('overview/:id')
  overviewById() {
    return RETURN_VALUE;
  }
}

@Module({
  imports: [ApplicationModule],
  controllers: [TestController],
})
class TestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.end(MIDDLEWARE_VALUE))
      .exclude('test', 'overview/:id', 'wildcard/(.*)', {
        path: 'middleware',
        method: RequestMethod.POST,
      })
      .forRoutes('*');
  }
}

describe('Exclude middleware (fastify)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = (
      await Test.createTestingModule({
        imports: [TestModule],
      }).compile()
    ).createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  it(`should exclude "/test" endpoint`, () => {
    return request(app.getHttpServer()).get('/test').expect(200, RETURN_VALUE);
  });

  it(`should not exclude "/test2" endpoint`, () => {
    return request(app.getHttpServer())
      .get('/test2')
      .expect(200, MIDDLEWARE_VALUE);
  });

  it(`should run middleware for "/middleware" endpoint`, () => {
    return request(app.getHttpServer())
      .get('/middleware')
      .expect(200, MIDDLEWARE_VALUE);
  });

  it(`should exclude POST "/middleware" endpoint`, () => {
    return request(app.getHttpServer())
      .post('/middleware')
      .expect(201, RETURN_VALUE);
  });

  it(`should exclude "/overview/:id" endpoint (by param)`, () => {
    return request(app.getHttpServer())
      .get('/overview/1')
      .expect(200, RETURN_VALUE);
  });

  it(`should exclude "/wildcard/overview" endpoint (by wildcard)`, () => {
    return request(app.getHttpServer())
      .get('/wildcard/overview')
      .expect(200, RETURN_VALUE);
  });

  afterEach(async () => {
    await app.close();
  });
});
