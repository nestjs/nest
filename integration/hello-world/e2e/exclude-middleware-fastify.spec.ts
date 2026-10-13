import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  Post,
  RequestMethod,
} from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

const RETURN_VALUE = 'test';
const MIDDLEWARE_VALUE = 'middleware';

@Controller()
class TestController {
  @Get('test')
  test() {
    return RETURN_VALUE;
  }

  @Get('test/test')
  testTest() {
    return RETURN_VALUE;
  }

  @Get('test2')
  test2() {
    return RETURN_VALUE;
  }

  @Get('middleware')
  middleware() {
    return RETURN_VALUE;
  }

  @Post('middleware')
  noMiddleware() {
    return RETURN_VALUE;
  }

  @Get('wildcard/overview')
  testOverview() {
    return RETURN_VALUE;
  }

  @Get('legacy-wildcard/overview')
  testLegacyWildcard() {
    return RETURN_VALUE;
  }

  @Get('splat-wildcard/overview')
  testSplatWildcard() {
    return RETURN_VALUE;
  }

  @Get('overview/:id')
  overviewById() {
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
      .apply((req, res, next) => res.end(MIDDLEWARE_VALUE))
      .exclude(
        'test',
        'overview/:id',
        'wildcard/*',
        'legacy-wildcard/(.*)',
        'splat-wildcard/*splat',
        {
          path: 'middleware',
          method: RequestMethod.POST,
        },
      )
      .forRoutes('*');
  }
}

@Controller('users')
class UsersController {
  @Get('login')
  login() {
    return RETURN_VALUE;
  }

  @Get(':id')
  findOne() {
    return RETURN_VALUE;
  }
}

@Controller('files')
class FilesController {
  @Get('public')
  public() {
    return RETURN_VALUE;
  }

  @Get('*')
  findAll() {
    return RETURN_VALUE;
  }
}

@Module({
  controllers: [UsersController, FilesController],
})
class RouteMatchingModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.end(MIDDLEWARE_VALUE))
      .exclude('users/login', 'files/public')
      .forRoutes(UsersController, FilesController);
  }
}

describe('Exclude middleware (fastify) - route matching', () => {
  let app: INestApplication;

  const createApp = async (adapter: FastifyAdapter) => {
    app = (
      await Test.createTestingModule({
        imports: [RouteMatchingModule],
      }).compile()
    ).createNestApplication<NestFastifyApplication>(adapter);

    await listenOnLoopback(app);
    await app.getHttpAdapter().getInstance().ready();
  };

  afterEach(async () => {
    await app.close();
  });

  describe('by default', () => {
    beforeEach(() => createApp(new FastifyAdapter()));

    it(`should exclude "/users/login" endpoint`, () => {
      return request(app.getHttpServer())
        .get('/users/login')
        .expect(200, RETURN_VALUE);
    });

    it(`should not exclude "/users/LOGIN", which the router serves with "/users/:id"`, () => {
      return request(app.getHttpServer())
        .get('/users/LOGIN')
        .expect(200, MIDDLEWARE_VALUE);
    });

    it(`should not exclude "/files/public/", which the router serves with "/files/*"`, () => {
      return request(app.getHttpServer())
        .get('/files/public/')
        .expect(200, MIDDLEWARE_VALUE);
    });
  });

  describe('when the router is case-insensitive', () => {
    beforeEach(() =>
      createApp(
        new FastifyAdapter({ routerOptions: { caseSensitive: false } }),
      ),
    );

    it(`should exclude "/users/LOGIN", which the router serves with "/users/login"`, () => {
      return request(app.getHttpServer())
        .get('/users/LOGIN')
        .expect(200, RETURN_VALUE);
    });
  });

  describe('when the router ignores a trailing slash', () => {
    beforeEach(() =>
      createApp(
        new FastifyAdapter({ routerOptions: { ignoreTrailingSlash: true } }),
      ),
    );

    it(`should exclude "/files/public/", which the router serves with "/files/public"`, () => {
      return request(app.getHttpServer())
        .get('/files/public/')
        .expect(200, RETURN_VALUE);
    });
  });
});

describe('Exclude middleware (fastify)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = (
      await Test.createTestingModule({
        imports: [TestModule],
      }).compile()
    ).createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await listenOnLoopback(app);
    await app.getHttpAdapter().getInstance().ready();
  });

  it(`should exclude "/test" endpoint`, () => {
    return request(app.getHttpServer()).get('/test').expect(200, RETURN_VALUE);
  });

  it(`should not exclude "/test/test" endpoint`, () => {
    return request(app.getHttpServer())
      .get('/test/test')
      .expect(200, MIDDLEWARE_VALUE);
  });

  it(`should not exclude "/test2" endpoint`, () => {
    return request(app.getHttpServer())
      .get('/test2')
      .expect(200, MIDDLEWARE_VALUE);
  });

  it(`should run middleware for "/middleware" endpoint`, () => {
    return request(app.getHttpServer())
      .get('/middleware')
      .expect(200, MIDDLEWARE_VALUE);
  });

  it(`should exclude POST "/middleware" endpoint`, () => {
    return request(app.getHttpServer())
      .post('/middleware')
      .expect(201, RETURN_VALUE);
  });

  it(`should exclude "/overview/:id" endpoint (by param)`, () => {
    return request(app.getHttpServer())
      .get('/overview/1')
      .expect(200, RETURN_VALUE);
  });

  it(`should exclude "/wildcard/overview" endpoint (by wildcard)`, () => {
    return request(app.getHttpServer())
      .get('/wildcard/overview')
      .expect(200, RETURN_VALUE);
  });

  it(`should exclude "/legacy-wildcard/overview" endpoint (by wildcard, legacy syntax)`, () => {
    return request(app.getHttpServer())
      .get('/legacy-wildcard/overview')
      .expect(200, RETURN_VALUE);
  });

  it(`should exclude "/splat-wildcard/overview" endpoint (by wildcard, new syntax)`, () => {
    return request(app.getHttpServer())
      .get('/splat-wildcard/overview')
      .expect(200, RETURN_VALUE);
  });

  afterEach(async () => {
    await app.close();
  });
});
