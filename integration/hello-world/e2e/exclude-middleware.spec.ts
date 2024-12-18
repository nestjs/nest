import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  Post,
  RequestMethod,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import path = require('path');
import { send } from 'process';

export const RETURN_VALUE = 'test';
export const MIDDLEWARE_VALUE = 'middleware';

export
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

  @Get('overview/all')
  overviewAll() {
    return RETURN_VALUE;
  }

  @Get('overview/:id')
  overviewById() {
    return RETURN_VALUE;
  }

  @Get('multiple/exclude')
  multipleExclude() {
    return RETURN_VALUE;
  }
}

function createTestModule<T = any>(
  forRoutesArg: string | (new (...args: any[]) => T),
) {
  @Module({
    imports: [AppModule],
    controllers: [TestController],
  })
  class TestModuleBase {
    configure(consumer: MiddlewareConsumer) {
      consumer
        .apply((req, res, next) => res.send(MIDDLEWARE_VALUE))
        .exclude('test', 'overview/:id', 'wildcard/(.*)', {
          path: 'middleware',
          method: RequestMethod.POST,
        })
        .exclude('multiple/exclude')
        .forRoutes(forRoutesArg);
    }
  }

  return TestModuleBase;
}

const TestModule = createTestModule('*');
const TestModule2 = createTestModule(TestController);

describe('Exclude middleware', () => {
  let app: INestApplication;

  describe('forRoutes is *', () => {
    beforeEach(async () => {
      app = (
        await Test.createTestingModule({
          imports: [TestModule],
        }).compile()
      ).createNestApplication();

      await app.init();
    });

    it(`should exclude "/test" endpoint`, () => {
      return request(app.getHttpServer())
        .get('/test')
        .expect(200, RETURN_VALUE);
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

    it(`should exclude "/multiple/exclude" endpoint`, () => {
      return request(app.getHttpServer())
        .get('/multiple/exclude')
        .expect(200, RETURN_VALUE);
    });
  });

  describe('forRoutes is Controller', () => {
    let app: INestApplication;

    beforeEach(async () => {
      app = (
        await Test.createTestingModule({
          imports: [TestModule2],
        }).compile()
      ).createNestApplication();

      await app.init();
    });

    it(`should exclude "/test" endpoint`, () => {
      return request(app.getHttpServer())
        .get('/test')
        .expect(200, RETURN_VALUE);
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

    it(`should not exclude "/overvview/all" endpoint`, () => {
      return request(app.getHttpServer())
        .get('/overview/all')
        .expect(200, MIDDLEWARE_VALUE);
    });

    it(`should exclude "/wildcard/overview" endpoint (by wildcard)`, () => {
      return request(app.getHttpServer())
        .get('/wildcard/overview')
        .expect(200, MIDDLEWARE_VALUE);
    });

    it(`should exclude "/multiple/exclude" endpoint`, () => {
      return request(app.getHttpServer())
        .get('/multiple/exclude')
        .expect(200, RETURN_VALUE);
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
