import {
  Controller,
  Get,
  INestApplication,
  Injectable,
  MiddlewareConsumer,
  NestMiddleware,
  Module,
} from '@nestjs/common';
import { Test } from '../../../packages/testing';
import * as request from 'supertest';
import { expect } from 'chai';

/**
 * Number of times that the middleware was executed.
 */
let triggerCounter = 0;
@Injectable()
class Middleware implements NestMiddleware {
  use(req, res, next) {
    triggerCounter++;
    next();
  }
}

@Controller()
class TestController {
  @Get('/test')
  testA() {}

  @Get('/:id')
  testB() {}

  @Get('/static/route')
  testC() {}

  @Get('/:id/:nested')
  testD() {}
}

@Module({
  controllers: [TestController],
})
class TestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(Middleware).forRoutes(TestController);
  }
}

describe('Middleware (run on route match)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    triggerCounter = 0;
    app = (
      await Test.createTestingModule({
        imports: [TestModule],
      }).compile()
    ).createNestApplication();

    await app.init();
  });

  it(`forRoutes(TestController) should execute middleware once when request url is equal match`, () => {
    return request(app.getHttpServer())
      .get('/test')
      .expect(200)
      .then(() => {
        expect(triggerCounter).to.be.eq(1);
      });
  });

  it(`forRoutes(TestController) should execute middleware once when request url is not equal match`, () => {
    return request(app.getHttpServer())
      .get('/1')
      .expect(200)
      .then(() => {
        expect(triggerCounter).to.be.eq(1);
      });
  });

  it(`forRoutes(TestController) should execute middleware once when request url is not of nested params`, () => {
    return request(app.getHttpServer())
      .get('/static/route')
      .expect(200)
      .then(() => {
        expect(triggerCounter).to.be.eq(1);
      });
  });

  it(`forRoutes(TestController) should execute middleware once when request url is of nested params`, () => {
    return request(app.getHttpServer())
      .get('/1/abc')
      .expect(200)
      .then(() => {
        expect(triggerCounter).to.be.eq(1);
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
