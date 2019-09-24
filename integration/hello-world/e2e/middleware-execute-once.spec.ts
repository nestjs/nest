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

let number: number = 0;

@Injectable()
class Middleware implements NestMiddleware {
  use(req, res, next) {
    number++;
    next();
  }
}

@Controller('/a')
class TestController {
  @Get('/test')
  testA() {
    return '';
  }
  @Get('/:id')
  testB() {
    return '';
  }
}

@Module({
  controllers: [TestController],
})
class TestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(Middleware).forRoutes(TestController);
  }
}

describe('Middleware (execution once)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = (await Test.createTestingModule({
      imports: [TestModule],
    }).compile()).createNestApplication();

    await app.init();
  });

  it(`forRoutes(TestController) should execute middleware once`, () => {
    return request(app.getHttpServer())
      .get('/a/test')
      .expect(200)
      .then(() => {
        expect(number).to.be.eq(1);
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
