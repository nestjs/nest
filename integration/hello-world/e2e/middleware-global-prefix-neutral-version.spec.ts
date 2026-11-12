import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  VERSION_NEUTRAL,
  VersioningType,
} from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

const RETURN_VALUE = 'metrics';
const MIDDLEWARE_VALUE = 'middleware';

// The path starts with a segment that reads like a version segment
@Controller({ path: 'v1/metrics', version: [VERSION_NEUTRAL, '1'] })
class MetricsController {
  @Get()
  find() {
    return RETURN_VALUE;
  }
}

@Module({ controllers: [MetricsController] })
class MetricsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.end(MIDDLEWARE_VALUE))
      .forRoutes(MetricsController);
  }
}

describe.each([
  ['Express', () => undefined],
  ['Fastify', () => new FastifyAdapter()],
])(
  'Middleware - version-neutral route excluded from the global prefix (%s)',
  (_, createAdapter) => {
    let app: INestApplication;

    const createApp = async (exclude: string[]) => {
      app = (
        await Test.createTestingModule({ imports: [MetricsModule] }).compile()
      ).createNestApplication(createAdapter());
      app.setGlobalPrefix('api', { exclude });
      app.enableVersioning({ type: VersioningType.URI });
      await listenOnLoopback(app);
    };

    afterEach(async () => {
      await app.close();
    });

    it(`should keep the version-neutral path "/v1/metrics" under the prefix when "metrics" is excluded`, async () => {
      await createApp(['metrics']);
      await request(app.getHttpServer())
        .get('/api/v1/metrics')
        .expect(200, MIDDLEWARE_VALUE);
      await request(app.getHttpServer()).get('/v1/metrics').expect(404);
    });

    it(`should take the version-neutral path "/v1/metrics" out of the prefix when "v1/metrics" is excluded`, async () => {
      await createApp(['v1/metrics']);
      await request(app.getHttpServer())
        .get('/v1/metrics')
        .expect(200, MIDDLEWARE_VALUE);
      await request(app.getHttpServer())
        .get('/v1/v1/metrics')
        .expect(200, MIDDLEWARE_VALUE);
      await request(app.getHttpServer()).get('/api/v1/metrics').expect(404);
    });
  },
);
