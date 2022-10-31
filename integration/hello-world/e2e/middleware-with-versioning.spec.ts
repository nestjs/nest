import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  Version,
  RequestMethod,
  VersioningType,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

const RETURN_VALUE = 'test';
const VERSIONED_VALUE = 'test_versioned';

@Controller()
class TestController {
  @Version('1')
  @Get('versioned')
  versionedTest() {
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
      .apply((req, res, next) => res.send(VERSIONED_VALUE))
      .forRoutes({
        path: '/versioned',
        version: '1',
        method: RequestMethod.ALL,
      });
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

    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: VERSION_NEUTRAL,
    });
    await app.init();
  });

  it(`forRoutes({ path: 'tests/versioned', version: '1', method: RequestMethod.ALL })`, () => {
    return request(app.getHttpServer())
      .get('/v1/versioned')
      .expect(200, VERSIONED_VALUE);
  });

  afterEach(async () => {
    await app.close();
  });
});
