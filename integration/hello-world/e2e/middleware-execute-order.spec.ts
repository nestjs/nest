import { INestApplication, MiddlewareConsumer, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

const RETURN_VALUE_A = 'test_A';
const RETURN_VALUE_B = 'test_B';

@Module({
  imports: [],
})
class TestAModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => {
        res.send(RETURN_VALUE_A);
      })
      .forRoutes('hello');
  }
}

@Module({
  imports: [TestAModule],
})
class TestBModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => {
        res.send(RETURN_VALUE_B);
      })
      .forRoutes('hello');
  }
}

@Module({
  imports: [TestBModule],
})
class TestModule {
}

describe('Middleware Execute Order', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = (await Test.createTestingModule({
      imports: [TestModule],
    }).compile()).createNestApplication();

    await app.init();
  });

  it(`Execute middleware of dependent modules first `, () => {
    return request(app.getHttpServer())
      .get('/hello')
      .expect(200, RETURN_VALUE_A);
  });

  afterEach(async () => {
    await app.close();
  });
});
