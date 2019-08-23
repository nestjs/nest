import { Controller, Get, MiddlewareConsumer, Module } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { ApplicationModule } from '../src/app.module';

const RETURN_VALUE = 'test';
const SCOPED_VALUE = 'test_scoped';
const PRE_HANDLER_HOOKS_VALUE = 'pre_handler_middleware';

@Controller()
class TestController {
  @Get('test')
  test() {
    return '';
  }
}

@Controller()
class PreHandlerHooksController {
  @Get('test2')
  test() {
    return '';
  }
}

@Module({
  imports: [ApplicationModule],
  controllers: [TestController, PreHandlerHooksController],
})
class TestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.end(SCOPED_VALUE))
      .forRoutes(TestController)
      .apply((req, res, next) => res.send(PRE_HANDLER_HOOKS_VALUE))
      .forRoutes(PreHandlerHooksController)
      .apply((req, res, next) => res.end(RETURN_VALUE))
      .forRoutes('*');
  }
}

describe('Middleware (FastifyAdapter)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    app = (await Test.createTestingModule({
      imports: [TestModule],
    }).compile()).createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

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

describe('Middleware (FastifyAdapter) with usePreHandlerHooks', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const adapter = new FastifyAdapter();
    adapter.usePreHandlerHooks();

    app = (await Test.createTestingModule({
      imports: [TestModule],
    }).compile()).createNestApplication<NestFastifyApplication>(
      adapter,
    );

    await app.init();
  });

  it(`forRoutes(PreHandlerHooksController)`, () => {
    return app
      .inject({
        method: 'GET',
        url: '/test2',
      })
      .then(({ payload }) => expect(payload).to.be.eql(PRE_HANDLER_HOOKS_VALUE));
  });

  afterEach(async () => {
    await app.close();
  });
});
