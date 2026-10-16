import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  Req,
  RequestMethod,
  RouteInfo,
  Type,
  Version,
  VERSION_NEUTRAL,
  VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import { CustomVersioningOptions } from '@nestjs/common/interfaces/index.js';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

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

@Controller('dogs')
class DogsController {
  @Get()
  findAll(@Req() req: { runs?: number }) {
    return `${req.runs ?? 0}`;
  }
}

@Controller({ path: 'dogs', version: VERSION_NEUTRAL })
class NeutralDogsController {
  @Get('neutral')
  findNeutral(@Req() req: { runs?: number }) {
    return `${req.runs ?? 0}`;
  }
}

@Controller({ path: 'dogs', version: ['1', VERSION_NEUTRAL] })
class MultipleDogsController {
  @Get('multiple')
  findMultiple(@Req() req: { runs?: number }) {
    return `${req.runs ?? 0}`;
  }
}

describe('Middleware - URI versioning with a default version', () => {
  let app: INestApplication;

  const createApp = async (
    ...routes: (string | Type<any> | RouteInfo)[]
  ): Promise<void> => {
    @Module({
      controllers: [
        DogsController,
        NeutralDogsController,
        MultipleDogsController,
      ],
    })
    class DogsModule {
      configure(consumer: MiddlewareConsumer) {
        consumer
          .apply((req, res, next) => {
            req.runs = (req.runs ?? 0) + 1;
            next();
          })
          .forRoutes(...routes);
      }
    }

    app = (
      await Test.createTestingModule({
        imports: [DogsModule],
      }).compile()
    ).createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await listenOnLoopback(app);
  };

  afterEach(async () => {
    await app.close();
  });

  it(`forRoutes('dogs') should run on "/v1/dogs"`, async () => {
    await createApp('dogs');
    await request(app.getHttpServer()).get('/v1/dogs').expect(200, '1');
  });

  it(`forRoutes({ path: 'dogs', method: RequestMethod.GET }) should run on "/v1/dogs"`, async () => {
    await createApp({ path: 'dogs', method: RequestMethod.GET });
    await request(app.getHttpServer()).get('/v1/dogs').expect(200, '1');
  });

  it(`forRoutes(NeutralDogsController) should only run on its own routes`, async () => {
    await createApp(NeutralDogsController);
    await request(app.getHttpServer()).get('/dogs/neutral').expect(200, '1');
    await request(app.getHttpServer()).get('/v1/dogs').expect(200, '0');
  });

  it(`forRoutes(MultipleDogsController) should run once on each of its routes`, async () => {
    await createApp(MultipleDogsController);
    await request(app.getHttpServer()).get('/dogs/multiple').expect(200, '1');
    await request(app.getHttpServer())
      .get('/v1/dogs/multiple')
      .expect(200, '1');
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
  await listenOnLoopback(app);

  return app;
}
