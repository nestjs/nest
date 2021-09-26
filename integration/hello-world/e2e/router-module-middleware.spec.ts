import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
} from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ApplicationModule } from '../src/app.module';

const RETURN_VALUE = 'test';
const SCOPED_VALUE = 'test_scoped';

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
}

@Module({
  imports: [ApplicationModule],
  controllers: [TestController],
})
class TestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.send(SCOPED_VALUE))
      .forRoutes(TestController);
  }
}

describe('RouterModule with Middleware functions', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = (
      await Test.createTestingModule({
        imports: [
          TestModule,
          RouterModule.register([
            {
              path: '/module-path/',
              module: TestModule,
            },
          ]),
        ],
      }).compile()
    ).createNestApplication();

    await app.init();
  });

  it(`forRoutes(TestController) - /test`, () => {
    return request(app.getHttpServer())
      .get('/module-path/test')
      .expect(200, SCOPED_VALUE);
  });

  it(`forRoutes(TestController) - /test2`, () => {
    return request(app.getHttpServer())
      .get('/module-path/test2')
      .expect(200, SCOPED_VALUE);
  });

  afterEach(async () => {
    await app.close();
  });
});
