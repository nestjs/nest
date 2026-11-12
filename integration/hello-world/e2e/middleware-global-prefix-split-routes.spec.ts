import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  RequestMethod,
  Type,
  VersioningType,
} from '@nestjs/common';
import { GlobalPrefixOptions, RouteInfo } from '@nestjs/common/interfaces';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

const RETURN_VALUE = 'test';
const MIDDLEWARE_VALUE = 'middleware';

@Controller('files')
class FilesController {
  @Get(':name')
  findOne() {
    return RETURN_VALUE;
  }

  @Get(':name/versions')
  findVersions() {
    return RETURN_VALUE;
  }
}

@Controller('health')
class HealthController {
  @Get('deep')
  deep() {
    return RETURN_VALUE;
  }
}

@Controller('users')
class UsersController {
  @Get()
  findAll() {
    return RETURN_VALUE;
  }

  @Get('me')
  findMe() {
    return RETURN_VALUE;
  }

  @Get(':id')
  findOne() {
    return RETURN_VALUE;
  }
}

const adapters: [string, () => FastifyAdapter | undefined][] = [
  ['Express', () => undefined],
  ['Fastify', () => new FastifyAdapter()],
];

describe('Middleware - routes on both sides of the global prefix', () => {
  let app: INestApplication;

  const createApp = async (
    adapter: FastifyAdapter | undefined,
    controllers: Type<any>[],
    route: string | RouteInfo,
    prefixOptions: GlobalPrefixOptions,
    configure: (app: INestApplication) => void = () => {},
  ) => {
    @Module({ controllers })
    class TestModule {
      configure(consumer: MiddlewareConsumer) {
        consumer
          .apply((req, res, next) => res.end(MIDDLEWARE_VALUE))
          .forRoutes(route);
      }
    }

    const testingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();
    app = adapter
      ? testingModule.createNestApplication(adapter)
      : testingModule.createNestApplication();
    app.setGlobalPrefix('api', prefixOptions);
    configure(app);
    await app.listen(0, '127.0.0.1');
  };

  afterEach(async () => {
    await app.close();
  });

  for (const [name, createAdapter] of adapters) {
    describe(`with the ${name} adapter`, () => {
      it(`forRoutes('files/*path') should run on the prefixed routes it covers when it reads as excluded`, async () => {
        // "files/:name" matches the text "files/*path", but not the route
        // "files/:name/versions", which the router keeps under the prefix
        await createApp(createAdapter(), [FilesController], 'files/*path', {
          exclude: ['files/:name'],
        });
        await request(app.getHttpServer())
          .get('/files/x')
          .expect(200, MIDDLEWARE_VALUE);
        await request(app.getHttpServer())
          .get('/api/files/x/versions')
          .expect(200, MIDDLEWARE_VALUE);
      });

      it(`forRoutes('files/*path') should run on the excluded routes it covers`, async () => {
        await createApp(createAdapter(), [FilesController], 'files/*path', {
          exclude: ['files/:name/versions'],
        });
        await request(app.getHttpServer())
          .get('/api/files/x')
          .expect(200, MIDDLEWARE_VALUE);
        await request(app.getHttpServer())
          .get('/files/x/versions')
          .expect(200, MIDDLEWARE_VALUE);
      });

      it(`an all-methods route should run on a route excluded for GET only`, async () => {
        await createApp(
          createAdapter(),
          [HealthController],
          { path: 'health/deep', method: RequestMethod.ALL },
          { exclude: [{ path: 'health/{*path}', method: RequestMethod.GET }] },
        );
        await request(app.getHttpServer())
          .get('/health/deep')
          .expect(200, MIDDLEWARE_VALUE);
      });

      it(`forRoutes('users/:id') should run on the route excluded for GET only`, async () => {
        await createApp(createAdapter(), [UsersController], 'users/:id', {
          exclude: [{ path: 'users/:id', method: RequestMethod.GET }],
        });
        await request(app.getHttpServer())
          .get('/users/42')
          .expect(200, MIDDLEWARE_VALUE);
      });

      it(`should not run on a path no route covered by it serves`, async () => {
        await createApp(createAdapter(), [FilesController], 'files/*path', {
          exclude: ['files/:name'],
        });
        // Under the prefix, only "files/:name/versions" is served
        await request(app.getHttpServer()).get('/api/files/x').expect(404);
      });
    });
  }

  for (const [name, createAdapter] of adapters.filter(
    ([name]) => name !== 'Fastify',
  )) {
    describe(`with the ${name} adapter, which mounts a plain string on its sub-paths`, () => {
      it(`forRoutes('users') should run on the prefixed routes below it when it is excluded`, async () => {
        await createApp(createAdapter(), [UsersController], 'users', {
          exclude: ['users'],
        });
        await request(app.getHttpServer())
          .get('/users')
          .expect(200, MIDDLEWARE_VALUE);
        await request(app.getHttpServer())
          .get('/api/users/42')
          .expect(200, MIDDLEWARE_VALUE);
      });

      it(`forRoutes('users') should run on the excluded routes below it`, async () => {
        await createApp(createAdapter(), [UsersController], 'users', {
          exclude: ['users/me'],
        });
        await request(app.getHttpServer())
          .get('/api/users/42')
          .expect(200, MIDDLEWARE_VALUE);
        await request(app.getHttpServer())
          .get('/users/me')
          .expect(200, MIDDLEWARE_VALUE);
      });
    });
  }
});

describe('Middleware - wildcard on routes excluded from the global prefix', () => {
  let app: INestApplication;

  const createApp = async (
    adapter: FastifyAdapter | undefined,
    controller: Type<any>,
    route: string | RouteInfo,
    exclude: GlobalPrefixOptions['exclude'],
    configure: (app: INestApplication) => void = () => {},
  ) => {
    @Module({ controllers: [controller, UsersController] })
    class TestModule {
      configure(consumer: MiddlewareConsumer) {
        consumer
          .apply((req, res, next) => res.end(MIDDLEWARE_VALUE))
          .forRoutes(route);
      }
    }

    const testingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();
    app = adapter
      ? testingModule.createNestApplication(adapter)
      : testingModule.createNestApplication();
    app.setGlobalPrefix('api', { exclude });
    configure(app);
    await app.listen(0, '127.0.0.1');
  };

  afterEach(async () => {
    await app.close();
  });

  for (const [name, createAdapter] of adapters) {
    describe(`with the ${name} adapter`, () => {
      // Fastify reads "*path" as a static segment
      const wildcard = name === 'Fastify' ? '*' : '*path';

      @Controller('documents')
      class DocumentsController {
        @Get(':id')
        findOne() {
          return RETURN_VALUE;
        }

        @Get(wildcard)
        download() {
          return RETURN_VALUE;
        }
      }

      for (const [title, route] of [
        ['{*splat}', '{*splat}'],
        [
          'RequestMethod.ALL {*splat}',
          { path: '{*splat}', method: RequestMethod.ALL },
        ],
        [
          'RequestMethod.GET *path',
          { path: '*path', method: RequestMethod.GET },
        ],
      ] as [string, string | RouteInfo][]) {
        it(`forRoutes(${title}) should run on the wildcard route a parameterized exclusion takes out of the prefix`, async () => {
          // The router tests the route as written ("/documents/*path"), which
          // the exclusion matches, and serves it at "/documents/a/b"
          await createApp(createAdapter(), DocumentsController, route, [
            'documents/:id',
          ]);
          await request(app.getHttpServer())
            .get('/documents/42')
            .expect(200, MIDDLEWARE_VALUE);
          await request(app.getHttpServer())
            .get('/documents/2026/payroll.pdf')
            .expect(200, MIDDLEWARE_VALUE);
          await request(app.getHttpServer())
            .get('/api/users/1')
            .expect(200, MIDDLEWARE_VALUE);
        });
      }

      it(`forRoutes('{*splat}') should run on the wildcard route excluded under the default version`, async () => {
        await createApp(
          createAdapter(),
          DocumentsController,
          '{*splat}',
          ['documents/:id'],
          app =>
            app.enableVersioning({
              type: VersioningType.URI,
              defaultVersion: '1',
            }),
        );
        await request(app.getHttpServer())
          .get('/v1/documents/42')
          .expect(200, MIDDLEWARE_VALUE);
        await request(app.getHttpServer())
          .get('/v1/documents/2026/payroll.pdf')
          .expect(200, MIDDLEWARE_VALUE);
      });
    });
  }
});
