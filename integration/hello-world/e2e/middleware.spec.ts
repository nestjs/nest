import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ApplicationModule } from '../src/app.module';

const RETURN_VALUE = 'test';
const SCOPED_VALUE = 'test_scoped';
const WILDCARD_VALUE = 'test_wildcard';

@Controller()
class TestController {
  @Get('test')
  test() {
    return RETURN_VALUE;
  }

  @Get('tests/wildcard_nested')
  // eslint-disable-next-line @typescript-eslint/camelcase
  wildcard_nested() {
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
      .apply((req, res, next) => res.send(WILDCARD_VALUE))
      .forRoutes('tests/*')
      .apply((req, res, next) => res.send(SCOPED_VALUE))
      .forRoutes(TestController)
      .apply((req, res, next) => res.send(RETURN_VALUE))
      .forRoutes('*');
  }
}

describe('Middleware', () => {
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
      .expect(200, RETURN_VALUE);
  });

  it(`forRoutes(TestController)`, () => {
    return request(app.getHttpServer())
      .get('/test')
      .expect(200, SCOPED_VALUE);
  });

  it(`forRoutes(tests/*)`, () => {
    return request(app.getHttpServer())
      .get('/tests/wildcard')
      .expect(200, WILDCARD_VALUE);
  });

  afterEach(async () => {
    await app.close();
  });
});
