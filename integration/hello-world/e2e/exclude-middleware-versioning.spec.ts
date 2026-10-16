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
import * as request from 'supertest';

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

for (const [name, createAdapter] of [
  ['Express', () => undefined],
  ['Fastify', () => new FastifyAdapter()],
] as const) {
  describe(`Exclude a version with header versioning (${name})`, () => {
    let app: INestApplication;

    const createApp = async (module: typeof MiddlewareModule) => {
      const testingModule = await Test.createTestingModule({
        imports: [module],
      }).compile();
      const adapter = createAdapter();
      app = adapter
        ? testingModule.createNestApplication(adapter)
        : testingModule.createNestApplication();
      app.enableVersioning({
        type: VersioningType.HEADER,
        header: 'X-Version',
      });
      await app.init();
      if (adapter) {
        await adapter.getInstance().ready();
      }
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
  });
}
