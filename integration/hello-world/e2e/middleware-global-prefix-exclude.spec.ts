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
import type { RouteInfo } from '@nestjs/common/interfaces';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

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

for (const [name, createAdapter] of [
  ['Express', () => undefined],
  ['Fastify', () => new FastifyAdapter()],
] as const) {
  describe(`Middleware - routes excluded from the global prefix (${name})`, () => {
    let app: INestApplication;

    beforeEach(async () => {
      const testingModule = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();
      const adapter = createAdapter();
      app = adapter
        ? testingModule.createNestApplication(adapter)
        : testingModule.createNestApplication();
      app.setGlobalPrefix('api', {
        exclude: [{ path: 'health', method: RequestMethod.GET }, 'users/me'],
      });
      await app.init();
      if (adapter) {
        await adapter.getInstance().ready();
      }
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
  });
}

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

for (const [name, createAdapter] of [
  ['Express', () => undefined],
  ['Fastify', () => new FastifyAdapter()],
] as const) {
  describe(`Middleware - controller root excluded from the global prefix by a wildcard (${name})`, () => {
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

      const testingModule = await Test.createTestingModule({
        imports: [ReportsModule],
      }).compile();
      const adapter = createAdapter();
      app = adapter
        ? testingModule.createNestApplication(adapter)
        : testingModule.createNestApplication();
      // The router tests the root route of the controller as "/reports/",
      // which the exclusion matches, and serves it at "/reports"
      app.setGlobalPrefix('api', { exclude: ['reports/{*path}'] });
      await app.init();
      if (adapter) {
        await adapter.getInstance().ready();
      }
    };

    afterEach(async () => {
      await app.close();
    });

    for (const route of ['{*path}', 'reports']) {
      it(`forRoutes('${route}') should run on "/reports"`, async () => {
        await createApp(route);
        await request(app.getHttpServer())
          .get('/reports')
          .expect(200, MIDDLEWARE_VALUE);
      });
    }
  });
}

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

for (const [name, createAdapter] of [
  ['Express', () => undefined],
  ['Fastify', () => new FastifyAdapter()],
] as const) {
  describe(`Middleware - wildcard on versioned routes excluded from the global prefix (${name})`, () => {
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

      const testingModule = await Test.createTestingModule({
        imports: [VersionedAdminModule],
      }).compile();
      const adapter = createAdapter();
      app = adapter
        ? testingModule.createNestApplication(adapter)
        : testingModule.createNestApplication();
      app.setGlobalPrefix('api', {
        exclude: ['admin/secret', 'admin/items/:version'],
      });
      app.enableVersioning(versioning);
      await app.init();
      if (adapter) {
        await adapter.getInstance().ready();
      }
    };

    afterEach(async () => {
      await app.close();
    });

    const versionings: [string, VersioningOptions, string][] = [
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
    ];

    for (const [title, versioning, url] of versionings) {
      it(`forRoutes('*') should run with ${title}`, async () => {
        await createApp(versioning);
        await request(app.getHttpServer())
          .get(url)
          .expect(200, MIDDLEWARE_VALUE);
      });
    }

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
  });
}

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

for (const [name, createAdapter] of [
  ['Express', () => undefined],
  ['Fastify', () => new FastifyAdapter()],
] as const) {
  describe(`Middleware - exclusion covering routes excluded from the global prefix (${name})`, () => {
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

      const testingModule = await Test.createTestingModule({
        imports: [ProbesModule],
      }).compile();
      const adapter = createAdapter();
      app = adapter
        ? testingModule.createNestApplication(adapter)
        : testingModule.createNestApplication();
      app.setGlobalPrefix('api', { exclude: prefixExclusions });
      await app.listen(0, '127.0.0.1');
    };

    afterEach(async () => {
      await app.close();
    });

    for (const exclusion of [
      'health/{*path}',
      'health/:check',
      'health/(.*)',
    ]) {
      it(`exclude('${exclusion}') should skip "/health/ready" excluded from the prefix`, async () => {
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
      });
    }

    for (const exclusion of ['health/{*path}', 'health/*', 'health/(.*)']) {
      it(`exclude('${exclusion}') should not skip "/health" excluded from the prefix as "health/"`, async () => {
        // Served at "/health", which the exclusion does not match
        await createApp(exclusion, ['health/']);
        await request(app.getHttpServer())
          .get('/health')
          .expect(200, MIDDLEWARE_VALUE);
        await request(app.getHttpServer())
          .get('/api/health/ready')
          .expect(200, RETURN_VALUE);
      });
    }

    it(`exclude('reports') should skip "/reports" excluded by a wildcard`, async () => {
      await createApp('reports', ['reports/{*path}']);
      await request(app.getHttpServer())
        .get('/reports')
        .expect(200, RETURN_VALUE);
      await request(app.getHttpServer())
        .get('/reports/1')
        .expect(200, MIDDLEWARE_VALUE);
    });
  });
}
