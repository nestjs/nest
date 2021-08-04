import {
  Controller,
  Get,
  INestApplication,
  Injectable,
  MiddlewareConsumer,
  Module,
  RequestMethod,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ApplicationModule } from '../src/app.module';
import { Response } from 'express';

const FOR_ROUTE_VALUE = 'test_for_route';
const INCLUDED_VALUE = 'test_included';
const MATCH_ALL_VALUE = 'test_match_all';
const RETURN_VALUE = 'test';
const WILDCARD_VALUE = 'test_wildcard';

@Controller()
class TestController {
  @Get('test')
  test() {
    return RETURN_VALUE;
  }

  @Get('tests/wildcard_nested')
  wildcard_nested() {
    return RETURN_VALUE;
  }

  @Get('tests/included')
  included() {
    return RETURN_VALUE;
  }
}

@Controller()
class ForRouteController {
  @Get('for_route/controller')
  test() {
    return RETURN_VALUE;
  }
}

@Controller()
class ForRouteNestedController {
  @Get('for_route/controller/nested')
  test() {
    return RETURN_VALUE;
  }
}

@Module({
  imports: [ApplicationModule],
  controllers: [TestController, ForRouteController, ForRouteNestedController],
})
class TestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res: Response, next) => res.status(201).end(INCLUDED_VALUE))
      .forRoutes({ path: 'tests/included', method: RequestMethod.POST })
      .apply((req, res, next) => res.status(200).end(WILDCARD_VALUE))
      .forRoutes('tests/*')
      .apply((req, res: Response, next) => res.status(200).end(FOR_ROUTE_VALUE))
      .forRoutes(ForRouteController)
      .apply((req, res, next) => res.status(200).end(MATCH_ALL_VALUE))
      .forRoutes('*');
  }
}

describe('Middleware (class)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = (
      await Test.createTestingModule({
        imports: [TestModule],
      }).compile()
    ).createNestApplication();

    await app.init();
  });

  it(`forRoutes(*)`, () => {
    return request(app.getHttpServer())
      .get('/hello')
      .expect(200, MATCH_ALL_VALUE);
  });

  it(`/test forRoutes(*)`, () => {
    return request(app.getHttpServer())
      .get('/test')
      .expect(200, MATCH_ALL_VALUE);
  });

  it(`forRoutes(tests/*)`, () => {
    return request(app.getHttpServer())
      .get('/tests/wildcard_nested')
      .expect(200, WILDCARD_VALUE);
  });

  it(`GET forRoutes(POST tests/included)`, () => {
    return request(app.getHttpServer())
      .get('/tests/included')
      .expect(200, WILDCARD_VALUE);
  });

  it(`POST forRoutes(POST tests/included)`, () => {
    return request(app.getHttpServer())
      .post('/tests/included')
      .expect(201, INCLUDED_VALUE);
  });

  it(`GET /for_route/controller forRoutes(ForRouteController)`, () => {
    return request(app.getHttpServer())
      .get('/for_route/controller')
      .expect(200, FOR_ROUTE_VALUE);
  });

  it(`GET /for_route/controller/nested forRoutes(*)`, () => {
    return request(app.getHttpServer())
      .get('/for_route/controller/nested')
      .expect(200, MATCH_ALL_VALUE);
  });

  afterEach(async () => {
    await app.close();
  });
});
