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
  VersioningOptions,
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

  describe('when using URI versioning', () => {
    beforeEach(async () => {
      app = await createAppWithVersioningType(VersioningType.URI);
    });

    it(`forRoutes({ path: '/versioned', version: '1', method: RequestMethod.ALL })`, () => {
      return request(app.getHttpServer())
        .get('/v1/versioned')
        .expect(200, VERSIONED_VALUE);
    });
  });

  describe('when using HEADER versioning', () => {
    beforeEach(async () => {
      app = await createAppWithVersioningType(VersioningType.HEADER);
    });

    it(`forRoutes({ path: '/versioned', version: '1', method: RequestMethod.ALL })`, () => {
      return request(app.getHttpServer())
        .get('/versioned')
        .expect(200, VERSIONED_VALUE);
    });
  });

  describe('when using MEDIA TYPE versioning', () => {
    beforeEach(async () => {
      app = await createAppWithVersioningType(VersioningType.MEDIA_TYPE);
    });

    it(`forRoutes({ path: '/versioned', version: '1', method: RequestMethod.ALL })`, () => {
      return request(app.getHttpServer())
        .get('/versioned')
        .expect(200, VERSIONED_VALUE);
    });
  });

  afterEach(async () => {
    await app.close();
  });
});

async function createAppWithVersioningType(
  versioningType: VersioningType,
): Promise<INestApplication> {
  const app = (
    await Test.createTestingModule({
      imports: [TestModule],
    }).compile()
  ).createNestApplication();

  app.enableVersioning({
    type: versioningType,
    defaultVersion: VERSION_NEUTRAL,
  } as VersioningOptions);
  await app.init();

  return app;
}
