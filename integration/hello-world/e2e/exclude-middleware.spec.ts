import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  Post,
  RequestMethod,
} from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import express from 'express';
import { AddressInfo, connect } from 'net';
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

  @Get('multiple/exclude')
  multipleExclude() {
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
      .apply((req, res, next) => res.send(MIDDLEWARE_VALUE))
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
      .exclude('multiple/exclude')
      .forRoutes('*path');
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

@Module({
  controllers: [UsersController],
})
class RouteMatchingModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.send(MIDDLEWARE_VALUE))
      .exclude('users/login')
      .forRoutes(UsersController);
  }
}

@Controller('profiles')
class ProfilesController {
  @Get(':id')
  findOne() {
    return RETURN_VALUE;
  }

  @Get(':id/avatar')
  avatar() {
    return RETURN_VALUE;
  }
}

@Module({
  controllers: [ProfilesController],
})
class RequestTargetModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.send(MIDDLEWARE_VALUE))
      .exclude('profiles/:id/avatar')
      .forRoutes(ProfilesController);
  }
}

describe('Exclude middleware - request targets', () => {
  let app: INestApplication;
  let port: number;

  /**
   * "supertest" never sends a "#" in the request target, so the request has
   * to be written to the socket manually.
   */
  const sendRawRequest = (requestTarget: string) =>
    new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      let response = '';
      const socket = connect(port, '127.0.0.1', () => {
        socket.write(
          `GET ${requestTarget} HTTP/1.1\r\n` +
            `Host: 127.0.0.1:${port}\r\n` +
            `Connection: close\r\n\r\n`,
        );
      });
      socket.setEncoding('utf8');
      socket.on('data', chunk => (response += chunk));
      socket.on('error', reject);
      socket.on('end', () => {
        const [head, body = ''] = response.split('\r\n\r\n');
        resolve({ statusCode: Number(head.split(' ')[1]), body });
      });
    });

  beforeEach(async () => {
    app = (
      await Test.createTestingModule({
        imports: [RequestTargetModule],
      }).compile()
    ).createNestApplication();

    await listenOnLoopback(app);
    port = (app.getHttpServer().address() as AddressInfo).port;
  });

  afterEach(async () => {
    await app.close();
  });

  it(`should exclude "/profiles/1/avatar" endpoint`, async () => {
    const response = await sendRawRequest('/profiles/1/avatar');
    expect(response.body).toBe(RETURN_VALUE);
  });

  it(`should not exclude "/profiles/1#/avatar", which the router serves with "/profiles/:id"`, async () => {
    const response = await sendRawRequest('/profiles/1#/avatar');
    expect(response.body).toBe(MIDDLEWARE_VALUE);
  });
});

@Controller('invoices')
class InvoicesController {
  @Get()
  findAll() {
    return RETURN_VALUE;
  }

  @Get(':token')
  findShared() {
    return RETURN_VALUE;
  }
}

@Module({
  controllers: [InvoicesController],
})
class TrailingSlashModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.send(MIDDLEWARE_VALUE))
      .exclude('invoices/*')
      .forRoutes(InvoicesController);
  }
}

describe('Exclude middleware - trailing slash', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = (
      await Test.createTestingModule({
        imports: [TrailingSlashModule],
      }).compile()
    ).createNestApplication();

    await listenOnLoopback(app);
  });

  afterEach(async () => {
    await app.close();
  });

  it(`should exclude "/invoices/abc" endpoint`, () => {
    return request(app.getHttpServer())
      .get('/invoices/abc')
      .expect(200, RETURN_VALUE);
  });

  it(`should not exclude "/invoices/", which the router serves with "/invoices"`, () => {
    return request(app.getHttpServer())
      .get('/invoices/')
      .expect(200, MIDDLEWARE_VALUE);
  });
});

describe('Exclude middleware - route matching', () => {
  let app: INestApplication;

  const createApp = async (adapter?: ExpressAdapter) => {
    const testingModule = await Test.createTestingModule({
      imports: [RouteMatchingModule],
    }).compile();
    app = adapter
      ? testingModule.createNestApplication(adapter)
      : testingModule.createNestApplication();

    await listenOnLoopback(app);
  };

  afterEach(async () => {
    await app.close();
  });

  describe('by default', () => {
    beforeEach(() => createApp());

    it(`should exclude "/users/LOGIN", which the router serves with "/users/login"`, () => {
      return request(app.getHttpServer())
        .get('/users/LOGIN')
        .expect(200, RETURN_VALUE);
    });

    it(`should exclude "/users/login/", which the router serves with "/users/login"`, () => {
      return request(app.getHttpServer())
        .get('/users/login/')
        .expect(200, RETURN_VALUE);
    });
  });

  describe('when the router is case-sensitive', () => {
    beforeEach(() => {
      const instance = express();
      instance.set('case sensitive routing', true);
      return createApp(new ExpressAdapter(instance));
    });

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
  });
});

describe('Exclude middleware', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = (
      await Test.createTestingModule({
        imports: [TestModule],
      }).compile()
    ).createNestApplication();

    await listenOnLoopback(app);
  });

  it(`should exclude "/test" endpoint`, () => {
    return request(app.getHttpServer()).get('/test').expect(200, RETURN_VALUE);
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

  it(`should exclude "/multiple/exclude" endpoint`, () => {
    return request(app.getHttpServer())
      .get('/multiple/exclude')
      .expect(200, RETURN_VALUE);
  });

  afterEach(async () => {
    await app.close();
  });
});
