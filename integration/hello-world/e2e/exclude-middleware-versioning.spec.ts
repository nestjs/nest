import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  Post,
  RequestMethod,
  VersioningType,
} from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
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
