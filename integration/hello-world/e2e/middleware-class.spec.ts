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
import { Response } from 'express';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

const INCLUDED_VALUE = 'test_included';
const RETURN_VALUE = 'test';
const WILDCARD_VALUE = 'test_wildcard';

@Injectable()
class Middleware {
  use(req, res, next) {
    res.send(WILDCARD_VALUE);
  }
}

@Controller()
class TestController {
  @Get('test')
  test() {
    return RETURN_VALUE;
  }
}

@Module({
  imports: [AppModule],
  controllers: [TestController],
})
class TestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res: Response, next) => res.status(201).end(INCLUDED_VALUE))
      .forRoutes({ path: 'tests/included', method: RequestMethod.POST })
      .apply(Middleware)
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
      .expect(200, WILDCARD_VALUE);
  });

  it(`/test forRoutes(*)`, () => {
    return request(app.getHttpServer())
      .get('/test')
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

  afterEach(async () => {
    await app.close();
  });
});
