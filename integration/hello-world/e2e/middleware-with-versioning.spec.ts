import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  RequestMethod,
  Version,
  VersioningOptions,
  VersioningType,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { CustomVersioningOptions } from '@nestjs/common/interfaces';
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

  describe('when using default URI versioning', () => {
    beforeEach(async () => {
      app = await createAppWithVersioning({
        type: VersioningType.URI,
        defaultVersion: VERSION_NEUTRAL,
      });
    });

    it(`forRoutes({ path: '/versioned', version: '1', method: RequestMethod.ALL })`, () => {
      return request(app.getHttpServer())
        .get('/v1/versioned')
        .expect(200, VERSIONED_VALUE);
    });
  });

  describe('when default URI versioning with an alternative prefix', () => {
    beforeEach(async () => {
      app = await createAppWithVersioning({
        type: VersioningType.URI,
        defaultVersion: VERSION_NEUTRAL,
        prefix: 'version',
      });
    });

    it(`forRoutes({ path: '/versioned', version: '1', method: RequestMethod.ALL })`, () => {
      return request(app.getHttpServer())
        .get('/version1/versioned')
        .expect(200, VERSIONED_VALUE);
    });
  });

  describe('when using default URI versioning with the global prefix', () => {
    beforeEach(async () => {
      app = await createAppWithVersioning(
        {
          type: VersioningType.URI,
          defaultVersion: VERSION_NEUTRAL,
        },
        async (app: INestApplication) => {
          app.setGlobalPrefix('api');
        },
      );
    });

    it(`forRoutes({ path: '/versioned', version: '1', method: RequestMethod.ALL })`, () => {
      return request(app.getHttpServer())
        .get('/api/v1/versioned')
        .expect(200, VERSIONED_VALUE);
    });
  });

  describe('when using HEADER versioning', () => {
    beforeEach(async () => {
      app = await createAppWithVersioning({
        type: VersioningType.HEADER,
        header: 'version',
      });
    });

    it(`forRoutes({ path: '/versioned', version: '1', method: RequestMethod.ALL })`, () => {
      return request(app.getHttpServer())
        .get('/versioned')
        .set('version', '1')
        .expect(200, VERSIONED_VALUE);
    });
  });

  describe('when using MEDIA TYPE versioning', () => {
    beforeEach(async () => {
      app = await createAppWithVersioning({
        type: VersioningType.MEDIA_TYPE,
        key: 'v',
        defaultVersion: VERSION_NEUTRAL,
      });
    });

    it(`forRoutes({ path: '/versioned', version: '1', method: RequestMethod.ALL })`, () => {
      return request(app.getHttpServer())
        .get('/versioned')
        .expect(200, VERSIONED_VALUE);
    });
  });

  describe('when using CUSTOM TYPE versioning', () => {
    beforeEach(async () => {
      const extractor: CustomVersioningOptions['extractor'] = () => '1';

      app = await createAppWithVersioning({
        type: VersioningType.CUSTOM,
        extractor,
      });
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

async function createAppWithVersioning(
  versioningOptions: VersioningOptions,
  beforeInit?: (app: INestApplication) => Promise<void>,
): Promise<INestApplication> {
  const app = (
    await Test.createTestingModule({
      imports: [TestModule],
    }).compile()
  ).createNestApplication();

  app.enableVersioning(versioningOptions);
  if (beforeInit) {
    await beforeInit(app);
  }
  await app.init();

  return app;
}
