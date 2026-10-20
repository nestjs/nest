import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  Type,
  VersioningType,
} from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

const RETURN_VALUE = 'test';
const MIDDLEWARE_VALUE = 'middleware';

@Controller('docs')
class DocsController {
  @Get('admin')
  admin() {
    return RETURN_VALUE;
  }

  @Get(':id.json')
  json() {
    return RETURN_VALUE;
  }
}

@Controller('files')
class FilesController {
  @Get(':id')
  findOne() {
    return RETURN_VALUE;
  }

  @Get('{*path}')
  findAll() {
    return RETURN_VALUE;
  }
}

@Controller({ path: 'accounts', version: '1' })
class AccountsV1Controller {
  @Get(':id')
  findOne() {
    return RETURN_VALUE;
  }
}

@Controller({ path: 'accounts', version: '2' })
class AccountsV2Controller {
  @Get('me')
  findMe() {
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

describe('Middleware - routes next to a parameterized route', () => {
  let app: INestApplication;

  const createApp = async (
    controllers: Type<any>[],
    beforeInit: (app: INestApplication) => void = () => {},
    adapter?: FastifyAdapter,
  ) => {
    @Module({ controllers })
    class TestModule {
      configure(consumer: MiddlewareConsumer) {
        consumer
          .apply((req, res, next) => res.end(MIDDLEWARE_VALUE))
          .forRoutes(...controllers);
      }
    }

    app = (
      await Test.createTestingModule({ imports: [TestModule] }).compile()
    ).createNestApplication(adapter);
    beforeInit(app);
    await listenOnLoopback(app);
  };

  afterEach(async () => {
    await app.close();
  });

  describe.each([
    ['Express', () => undefined],
    ['Fastify', () => new FastifyAdapter()],
  ])('with the %s adapter', (_, createAdapter) => {
    it(`should run on "/docs/admin" next to "/docs/:id.json"`, async () => {
      await createApp([DocsController], undefined, createAdapter());
      await request(app.getHttpServer())
        .get('/docs/x.json')
        .expect(200, MIDDLEWARE_VALUE);
      await request(app.getHttpServer())
        .get('/docs/admin')
        .expect(200, MIDDLEWARE_VALUE);
    });

    it(`should run on "/v2/accounts/me" next to "/v1/accounts/:id"`, async () => {
      await createApp(
        [AccountsV1Controller, AccountsV2Controller],
        app => app.enableVersioning({ type: VersioningType.URI }),
        createAdapter(),
      );
      await request(app.getHttpServer())
        .get('/v1/accounts/1')
        .expect(200, MIDDLEWARE_VALUE);
      await request(app.getHttpServer())
        .get('/v2/accounts/me')
        .expect(200, MIDDLEWARE_VALUE);
    });

    it(`should run on "/users/me" excluded from the global prefix next to "/api/users/:id"`, async () => {
      await createApp(
        [UsersController],
        app => app.setGlobalPrefix('api', { exclude: ['users/me'] }),
        createAdapter(),
      );
      await request(app.getHttpServer())
        .get('/api/users/1')
        .expect(200, MIDDLEWARE_VALUE);
      await request(app.getHttpServer())
        .get('/users/me')
        .expect(200, MIDDLEWARE_VALUE);
    });
  });

  it(`should run on "/files/a/b" next to "/files/:id"`, async () => {
    await createApp([FilesController]);
    await request(app.getHttpServer())
      .get('/files/a')
      .expect(200, MIDDLEWARE_VALUE);
    await request(app.getHttpServer())
      .get('/files/a/b')
      .expect(200, MIDDLEWARE_VALUE);
  });
});
