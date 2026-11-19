import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  Post,
  Req,
  RequestMethod,
  Type,
  VERSION_NEUTRAL,
  type VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import type { RouteInfo } from '@nestjs/common/internal';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

const MIDDLEWARE_VALUE = 'middleware';

@Controller({ path: 'reports', version: '1' })
class ReportsV1Controller {
  @Get()
  findAll() {
    return 'v1';
  }

  @Post()
  create() {
    return 'v1';
  }
}

@Controller({ path: 'reports', version: '2' })
class ReportsV2Controller {
  @Get()
  findAll() {
    return 'v2';
  }

  @Post()
  create() {
    return 'v2';
  }
}

@Module({
  controllers: [ReportsV1Controller, ReportsV2Controller],
})
class MiddlewareModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.end(MIDDLEWARE_VALUE))
      .exclude({ path: 'reports', method: RequestMethod.GET, version: '1' })
      .forRoutes('reports');
  }
}

@Module({
  controllers: [ReportsV1Controller, ReportsV2Controller],
})
class CsrfModule {}

describe.each([
  ['Express', () => undefined],
  ['Fastify', () => new FastifyAdapter()],
])('Exclude a version with header versioning (%s)', (_, createAdapter) => {
  let app: INestApplication;

  const createApp = async (
    module: typeof MiddlewareModule,
    beforeInit: (app: INestApplication) => void = () => {},
  ) => {
    app = (
      await Test.createTestingModule({ imports: [module] }).compile()
    ).createNestApplication(createAdapter());
    app.enableVersioning({ type: VersioningType.HEADER, header: 'X-Version' });
    beforeInit(app);
    await listenOnLoopback(app);
  };

  afterEach(async () => {
    await app.close();
  });

  it('should skip the middleware for the excluded version only', async () => {
    await createApp(MiddlewareModule);
    await request(app.getHttpServer())
      .get('/reports')
      .set('X-Version', '1')
      .expect(200, 'v1');
    await request(app.getHttpServer())
      .get('/reports')
      .set('X-Version', '2')
      .expect(200, MIDDLEWARE_VALUE);
  });

  it('should skip the CSRF check for the excluded version only', async () => {
    await createApp(CsrfModule, app =>
      app.enableCsrfProtection({
        exclude: [
          { path: 'reports', method: RequestMethod.POST, version: '1' },
        ],
      }),
    );
    const post = (version: string) =>
      request(app.getHttpServer())
        .post('/reports')
        .set('Host', 'app.example')
        .set('Sec-Fetch-Site', 'cross-site')
        .set('Origin', 'https://evil.example')
        .set('X-Version', version);

    await post('1').expect(201, 'v1');
    await post('2').expect(403);
  });
});

// With Fastify, the middleware gets the raw request
type RunsRequest = { runs?: number; raw?: { runs?: number } };
const getRuns = (req: RunsRequest) => (req.raw ?? req).runs ?? 0;

// Served under the default version (or without a version when there is none)
@Controller('docs')
class DocsController {
  @Get()
  findAll(@Req() req: RunsRequest) {
    return `docs:${getRuns(req)}`;
  }

  @Post()
  create(@Req() req: RunsRequest) {
    return `docs:${getRuns(req)}`;
  }
}

@Controller({ path: 'docs', version: '3' })
class DocsV3Controller {
  @Get()
  findAll(@Req() req: RunsRequest) {
    return `docs-v3:${getRuns(req)}`;
  }
}

@Controller('status')
class StatusController {
  @Get()
  findAll(@Req() req: RunsRequest) {
    return `status:${getRuns(req)}`;
  }
}

@Controller({ path: 'status', version: VERSION_NEUTRAL })
class NeutralStatusController {
  @Get()
  findAll(@Req() req: RunsRequest) {
    return `status-neutral:${getRuns(req)}`;
  }
}

@Controller('health')
class HealthController {
  @Get()
  check(@Req() req: RunsRequest) {
    return `health:${getRuns(req)}`;
  }
}

@Controller('kept')
class KeptController {
  @Get()
  findAll(@Req() req: RunsRequest) {
    return `kept:${getRuns(req)}`;
  }

  @Post()
  create(@Req() req: RunsRequest) {
    return `kept:${getRuns(req)}`;
  }
}

describe.each([
  ['Express', () => undefined],
  ['Fastify', () => new FastifyAdapter()],
  ['Node', () => new NodeAdapter()],
])(
  'Exclude a route without a version with URI versioning (%s)',
  (_, createAdapter) => {
    let app: INestApplication;

    const createApp = async ({
      versioning,
      controllers,
      exclude = [],
      beforeInit = () => {},
    }: {
      versioning: VersioningOptions;
      controllers: Type<any>[];
      exclude?: (string | RouteInfo)[];
      beforeInit?: (app: INestApplication) => void;
    }) => {
      @Module({ controllers })
      class DocsModule {
        configure(consumer: MiddlewareConsumer) {
          consumer
            .apply((req, res, next) => {
              req.runs = (req.runs ?? 0) + 1;
              next();
            })
            .exclude(...exclude)
            .forRoutes(...controllers);
        }
      }

      app = (
        await Test.createTestingModule({ imports: [DocsModule] }).compile()
      ).createNestApplication(createAdapter());
      app.enableVersioning(versioning);
      beforeInit(app);
      await listenOnLoopback(app);
    };
    const get = (path: string) => request(app.getHttpServer()).get(path);

    afterEach(async () => {
      await app.close();
    });

    describe('with a default version', () => {
      const versioning: VersioningOptions = {
        type: VersioningType.URI,
        defaultVersion: '1',
      };

      it.each<[string, string | RouteInfo]>([
        [`'docs'`, 'docs'],
        [
          `{ path: 'docs', method: GET }`,
          { path: 'docs', method: RequestMethod.GET },
        ],
        [
          `{ path: 'docs', method: GET, version: '1' }`,
          { path: 'docs', method: RequestMethod.GET, version: '1' },
        ],
      ])(
        'exclude(%s) should skip the middleware for the route of the default version',
        async (_, route) => {
          await createApp({
            versioning,
            controllers: [DocsController, KeptController],
            exclude: [route],
          });
          await get('/v1/docs').expect(200, 'docs:0');
          await get('/v1/kept').expect(200, 'kept:1');
        },
      );

      it(`exclude({ path: 'docs', method: GET }) should not skip the middleware for another method`, async () => {
        await createApp({
          versioning,
          controllers: [DocsController],
          exclude: [{ path: 'docs', method: RequestMethod.GET }],
        });
        await request(app.getHttpServer())
          .post('/v1/docs')
          .expect(201, 'docs:1');
      });

      it(`exclude('docs') should not skip the middleware for a route of another version`, async () => {
        await createApp({
          versioning,
          controllers: [DocsController, DocsV3Controller],
          exclude: ['docs'],
        });
        await get('/v1/docs').expect(200, 'docs:0');
        await get('/v3/docs').expect(200, 'docs-v3:1');
      });

      it(`exclude('status') should skip the middleware for the neutral and the default route of the path`, async () => {
        await createApp({
          versioning,
          controllers: [StatusController, NeutralStatusController],
          exclude: ['status'],
        });
        await get('/status').expect(200, 'status-neutral:0');
        await get('/v1/status').expect(200, 'status:0');
      });

      it(`exclude({ path: 'status', method: GET, version: VERSION_NEUTRAL }) should only skip the neutral route`, async () => {
        await createApp({
          versioning,
          controllers: [StatusController, NeutralStatusController],
          exclude: [
            {
              path: 'status',
              method: RequestMethod.GET,
              version: VERSION_NEUTRAL,
            },
          ],
        });
        await get('/status').expect(200, 'status-neutral:0');
        await get('/v1/status').expect(200, 'status:1');
      });

      it(`exclude('docs', 'health') should skip the middleware on both sides of the global prefix`, async () => {
        await createApp({
          versioning,
          controllers: [DocsController, HealthController, KeptController],
          exclude: ['docs', 'health'],
          beforeInit: app =>
            app.setGlobalPrefix('api', { exclude: ['health'] }),
        });
        await get('/api/v1/docs').expect(200, 'docs:0');
        await get('/v1/health').expect(200, 'health:0');
        await get('/api/v1/kept').expect(200, 'kept:1');
      });

      it('should skip the CSRF check for the route of the default version', async () => {
        await createApp({
          versioning,
          controllers: [DocsController, KeptController],
          beforeInit: app =>
            app.enableCsrfProtection({
              exclude: [{ path: 'docs', method: RequestMethod.POST }],
            }),
        });
        const post = (path: string) =>
          request(app.getHttpServer())
            .post(path)
            .set('Host', 'app.example')
            .set('Sec-Fetch-Site', 'cross-site')
            .set('Origin', 'https://evil.example');

        await post('/v1/docs').expect(201, 'docs:1');
        await post('/v1/kept').expect(403);
      });
    });

    it(`exclude('docs') should skip the middleware for the routes of every default version`, async () => {
      await createApp({
        versioning: { type: VersioningType.URI, defaultVersion: ['1', '2'] },
        controllers: [DocsController, DocsV3Controller],
        exclude: ['docs'],
      });
      await get('/v1/docs').expect(200, 'docs:0');
      await get('/v2/docs').expect(200, 'docs:0');
      await get('/v3/docs').expect(200, 'docs-v3:1');
    });

    it.each<[string, VersioningOptions]>([
      [
        'a neutral default version',
        { type: VersioningType.URI, defaultVersion: VERSION_NEUTRAL },
      ],
      ['no default version', { type: VersioningType.URI }],
    ])(
      `exclude('docs') should skip the middleware for the route without a version with %s`,
      async (_, versioning) => {
        await createApp({
          versioning,
          controllers: [DocsController, KeptController],
          exclude: ['docs'],
        });
        await get('/docs').expect(200, 'docs:0');
        await get('/kept').expect(200, 'kept:1');
      },
    );
  },
);
