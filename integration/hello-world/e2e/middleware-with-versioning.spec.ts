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
import { FastifyAdapter } from '@nestjs/platform-fastify';
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
        .set('Accept', 'application/json;v1')
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

// With Fastify, the middleware gets the raw request
type RunsRequest = { runs?: number; raw?: { runs?: number } };
const getRuns = (req: RunsRequest) => (req.raw ?? req).runs ?? 0;

@Controller({ path: 'cats', version: '1' })
class CatsV1Controller {
  @Get()
  findAll(@Req() req: RunsRequest) {
    return `v1:${getRuns(req)}`;
  }
}

@Controller({ path: 'cats', version: '2' })
class CatsV2Controller {
  @Get()
  findAll(@Req() req: RunsRequest) {
    return `v2:${getRuns(req)}`;
  }
}

@Controller({ path: 'birds', version: ['1', '2'] })
class BirdsController {
  @Get()
  findAll(@Req() req: RunsRequest) {
    return `${getRuns(req)}`;
  }
}

describe.each([
  ['Express', () => undefined],
  ['Fastify', () => new FastifyAdapter()],
])(
  'Middleware - versions that are not in the path (%s)',
  (_, createAdapter) => {
    let app: INestApplication;

    const createApp = async (
      versioningOptions: VersioningOptions,
      ...routes: (Type<any> | RouteInfo)[]
    ): Promise<void> => {
      @Module({
        controllers: [CatsV1Controller, CatsV2Controller, BirdsController],
      })
      class CatsModule {
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
          imports: [CatsModule],
        }).compile()
      ).createNestApplication(createAdapter());
      app.enableVersioning(versioningOptions);
      await listenOnLoopback(app);
    };

    afterEach(async () => {
      await app.close();
    });

    describe.each([
      [
        'HEADER',
        { type: VersioningType.HEADER, header: 'X-Version' },
        (version: string) => ({ 'X-Version': version }),
      ],
      [
        'MEDIA TYPE',
        { type: VersioningType.MEDIA_TYPE, key: 'v=' },
        (version: string) => ({ Accept: `application/json;v=${version}` }),
      ],
      [
        'CUSTOM',
        {
          type: VersioningType.CUSTOM,
          extractor: (req: { headers: Record<string, string> }) =>
            req.headers['x-version'],
        },
        (version: string) => ({ 'X-Version': version }),
      ],
    ] as const)('when using %s versioning', (_, versioningOptions, headers) => {
      const get = (path: string, version: string) =>
        request(app.getHttpServer()).get(path).set(headers(version));

      it(`forRoutes(CatsV1Controller) should only run for version 1`, async () => {
        await createApp(versioningOptions, CatsV1Controller);
        await get('/cats', '1').expect(200, 'v1:1');
        await get('/cats', '2').expect(200, 'v2:0');
      });

      it(`forRoutes({ path: 'cats', method: RequestMethod.GET, version: '2' }) should only run for version 2`, async () => {
        await createApp(versioningOptions, {
          path: 'cats',
          method: RequestMethod.GET,
          version: '2',
        });
        await get('/cats', '1').expect(200, 'v1:0');
        await get('/cats', '2').expect(200, 'v2:1');
      });

      it(`forRoutes(BirdsController) should run once for each of its versions`, async () => {
        await createApp(versioningOptions, BirdsController);
        await get('/birds', '1').expect(200, '1');
        await get('/birds', '2').expect(200, '1');
      });
    });
  },
);

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
