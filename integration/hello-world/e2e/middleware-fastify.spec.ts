import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
} from '@nestjs/common';
import { INestFastifyApplication } from '@nestjs/common/interfaces/nest-fastify-application.interface';
import { FastifyAdapter } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { ApplicationModule } from '../src/app.module';

const RETURN_VALUE = 'test';
const SCOPED_VALUE = 'test_scoped';

@Controller()
class TestController {
  @Get('test')
  test() {
    return '';
  }
}

@Module({
  imports: [ApplicationModule],
  controllers: [TestController],
})
class TestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.end(SCOPED_VALUE))
      .forRoutes(TestController)
      .apply((req, res, next) => res.end(RETURN_VALUE))
      .forRoutes('*');
  }
}

describe('Middleware (FastifyAdapter)', () => {
  let app: INestFastifyApplication & INestApplication;

  beforeEach(async () => {
    app = (await Test.createTestingModule({
      imports: [TestModule],
    }).compile()).createNestApplication(new FastifyAdapter());

    await app.init();
  });

  it(`forRoutes(*)`, () => {
    return app
      .inject({
        method: 'GET',
        url: '/hello',
      })
      .then(({ payload }) => expect(payload).to.be.eql(RETURN_VALUE));
  });

  it(`forRoutes(TestController)`, () => {
    return app
      .inject({
        method: 'GET',
        url: '/test',
      })
      .then(({ payload }) => expect(payload).to.be.eql(SCOPED_VALUE));
  });

  afterEach(async () => {
    await app.close();
  });
});
