import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  Post,
  RequestMethod,
  VERSION_NEUTRAL,
  type VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import type { RouteInfo } from '@nestjs/common/internal';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

const RETURN_VALUE = 'test';
const MIDDLEWARE_VALUE = 'middleware';

@Controller()
class HealthController {
  @Get('health')
  getHealth() {
    return RETURN_VALUE;
  }

  @Post('health')
  postHealth() {
    return RETURN_VALUE;
  }
}

@Controller('users')
class UsersController {
  @Get('me')
  findMe() {
    return RETURN_VALUE;
  }

  @Get(':id')
  findOne() {
    return RETURN_VALUE;
  }
}

@Module({
  controllers: [HealthController, UsersController],
})
class TestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.end(MIDDLEWARE_VALUE))
      .forRoutes('health', { path: 'users/:id', method: RequestMethod.GET });
  }
}

describe.each([
  ['Express', () => undefined],
  ['Fastify', () => new FastifyAdapter()],
])(
  'Middleware - routes excluded from the global prefix (%s)',
  (_, createAdapter) => {
    let app: INestApplication;

    beforeEach(async () => {
      app = (
        await Test.createTestingModule({ imports: [TestModule] }).compile()
      ).createNestApplication(createAdapter());
      app.setGlobalPrefix('api', {
        exclude: [{ path: 'health', method: RequestMethod.GET }, 'users/me'],
      });
      await listenOnLoopback(app);
    });

    afterEach(async () => {
      await app.close();
    });

    it(`forRoutes('health') should run on "GET /health" excluded for GET`, async () => {
      await request(app.getHttpServer())
        .get('/health')
        .expect(200, MIDDLEWARE_VALUE);
      await request(app.getHttpServer())
        .post('/api/health')
        .expect(200, MIDDLEWARE_VALUE);
      await request(app.getHttpServer()).post('/health').expect(404);
    });

    it(`forRoutes('users/:id') should run on "/users/me" excluded from the prefix`, async () => {
      await request(app.getHttpServer())
        .get('/api/users/1')
        .expect(200, MIDDLEWARE_VALUE);
      await request(app.getHttpServer())
        .get('/users/me')
        .expect(200, MIDDLEWARE_VALUE);
    });
  },
);

@Controller('reports')
class ReportsController {
  @Get()
  findAll() {
    return RETURN_VALUE;
  }

  @Get(':id')
  findOne() {
    return RETURN_VALUE;
  }
}

describe.each([
  ['Express', () => undefined],
  ['Fastify', () => new FastifyAdapter()],
])(
  'Middleware - controller root excluded from the global prefix by a wildcard (%s)',
  (_, createAdapter) => {
    let app: INestApplication;

    const createApp = async (route: string) => {
      @Module({
        controllers: [ReportsController],
      })
      class ReportsModule {
        configure(consumer: MiddlewareConsumer) {
          consumer
            .apply((req, res, next) => res.end(MIDDLEWARE_VALUE))
            .forRoutes(route);
        }
      }

      app = (
        await Test.createTestingModule({ imports: [ReportsModule] }).compile()
      ).createNestApplication(createAdapter());
      // The router tests the root route of the controller as "/reports/",
      // which the exclusion matches, and serves it at "/reports"
      app.setGlobalPrefix('api', { exclude: ['reports/{*path}'] });
      await listenOnLoopback(app);
    };

    afterEach(async () => {
      await app.close();
    });

    it.each(['{*path}', 'reports'])(
      `forRoutes('%s') should run on "/reports"`,
      async route => {
        await createApp(route);
        await request(app.getHttpServer())
          .get('/reports')
          .expect(200, MIDDLEWARE_VALUE);
      },
    );
  },
);

@Controller('health')
class ProbesController {
  @Get()
  live() {
    return RETURN_VALUE;
  }

  @Get('ready')
  ready() {
    return RETURN_VALUE;
  }
}

describe.each([
  ['Express', () => undefined],
  ['Fastify', () => new FastifyAdapter()],
])(
  'Middleware - exclusion covering routes excluded from the global prefix (%s)',
  (_, createAdapter) => {
    let app: INestApplication;

    const createApp = async (exclusion: string, prefixExclusions: string[]) => {
      @Module({
        controllers: [ProbesController, ReportsController, UsersController],
      })
      class ProbesModule {
        configure(consumer: MiddlewareConsumer) {
          consumer
            .apply((req, res, next) => res.end(MIDDLEWARE_VALUE))
            .exclude(exclusion)
            .forRoutes('{*path}');
        }
      }

      app = (
        await Test.createTestingModule({ imports: [ProbesModule] }).compile()
      ).createNestApplication(createAdapter());
      app.setGlobalPrefix('api', { exclude: prefixExclusions });
      await listenOnLoopback(app);
    };

    afterEach(async () => {
      await app.close();
    });

    it.each(['health/{*path}', 'health/:check', 'health/(.*)'])(
      `exclude('%s') should skip "/health/ready" excluded from the prefix`,
      async exclusion => {
        await createApp(exclusion, ['health', 'health/ready']);
        await request(app.getHttpServer())
          .get('/health/ready')
          .expect(200, RETURN_VALUE);
        await request(app.getHttpServer())
          .get('/health')
          .expect(200, MIDDLEWARE_VALUE);
        await request(app.getHttpServer())
          .get('/api/users/1')
          .expect(200, MIDDLEWARE_VALUE);
      },
    );

    it(`exclude('reports') should skip "/reports" excluded by a wildcard`, async () => {
      await createApp('reports', ['reports/{*path}']);
      await request(app.getHttpServer())
        .get('/reports')
        .expect(200, RETURN_VALUE);
      await request(app.getHttpServer())
        .get('/reports/1')
        .expect(200, MIDDLEWARE_VALUE);
    });
  },
);

@Controller({ path: 'admin', version: '2' })
class VersionedAdminController {
  @Get('secret')
  getSecret() {
    return RETURN_VALUE;
  }

  @Get('items/:version')
  findItem() {
    return RETURN_VALUE;
  }
}

describe.each([
  ['Express', () => undefined],
  ['Fastify', () => new FastifyAdapter()],
])(
  'Middleware - wildcard on versioned routes excluded from the global prefix (%s)',
  (_, createAdapter) => {
    let app: INestApplication;

    const createApp = async (
      versioning: VersioningOptions,
      route: string | RouteInfo = '*',
    ) => {
      @Module({
        controllers: [VersionedAdminController],
      })
      class VersionedAdminModule {
        configure(consumer: MiddlewareConsumer) {
          consumer
            .apply((req, res, next) => res.end(MIDDLEWARE_VALUE))
            .forRoutes(route);
        }
      }

      app = (
        await Test.createTestingModule({
          imports: [VersionedAdminModule],
        }).compile()
      ).createNestApplication(createAdapter());
      app.setGlobalPrefix('api', {
        exclude: ['admin/secret', 'admin/items/:version'],
      });
      app.enableVersioning(versioning);
      await listenOnLoopback(app);
    };

    afterEach(async () => {
      await app.close();
    });

    it.each<[string, VersioningOptions, string]>([
      [
        'a default version',
        { type: VersioningType.URI, defaultVersion: '1' },
        '/v2/admin/secret',
      ],
      ['no default version', { type: VersioningType.URI }, '/v2/admin/secret'],
      [
        'a neutral default version',
        { type: VersioningType.URI, defaultVersion: VERSION_NEUTRAL },
        '/v2/admin/secret',
      ],
      [
        'a custom version prefix',
        { type: VersioningType.URI, defaultVersion: '1', prefix: 'ver' },
        '/ver2/admin/secret',
      ],
      [
        'no version prefix',
        { type: VersioningType.URI, defaultVersion: '1', prefix: false },
        '/2/admin/secret',
      ],
    ])(`forRoutes('*') should run with %s`, async (_, versioning, url) => {
      await createApp(versioning);
      await request(app.getHttpServer()).get(url).expect(200, MIDDLEWARE_VALUE);
    });

    it(`forRoutes('*') should run on an excluded route with a "version" parameter`, async () => {
      await createApp({ type: VersioningType.URI, defaultVersion: '1' });
      await request(app.getHttpServer())
        .get('/v2/admin/items/1')
        .expect(200, MIDDLEWARE_VALUE);
    });

    it(`forRoutes({ path: '*', version: '1' }) should not run for another version`, async () => {
      await createApp(
        { type: VersioningType.URI, defaultVersion: '1' },
        { path: '*', method: RequestMethod.ALL, version: '1' },
      );
      await request(app.getHttpServer())
        .get('/v2/admin/secret')
        .expect(200, RETURN_VALUE);
    });
  },
);
