import {
  ArgumentsHost,
  Body,
  Catch,
  Controller,
  ExceptionFilter,
  ForbiddenException,
  Get,
  HttpException,
  Inject,
  Injectable,
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestMiddleware,
  NestModule,
  NotFoundException,
  Post,
  Provider,
  Scope,
} from '@nestjs/common';
import { AbstractHttpAdapter, APP_FILTER, REQUEST } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';

const SECRET = 'pg-internal-7.corp:5432';
const OPAQUE_BODY = { error: 'request failed' };

const reply = (host: ArgumentsHost, status: number, body: object) => {
  const response = host.switchToHttp().getResponse();
  // "@fastify/middie" passes the raw response to a middleware
  if (!response.status) {
    response.statusCode = status;
    response.setHeader('content-type', 'application/json');
    return response.end(JSON.stringify(body));
  }
  return response.status(status).send(body);
};

@Injectable()
class ErrorBody {
  get() {
    return OPAQUE_BODY;
  }
}

@Injectable({ scope: Scope.TRANSIENT })
class TransientErrorBody extends ErrorBody {}

@Catch()
@Injectable()
class OpaqueFilter implements ExceptionFilter {
  constructor(
    private readonly errorBody: ErrorBody,
    private readonly transientErrorBody: TransientErrorBody,
  ) {}

  catch(_exception: unknown, host: ArgumentsHost) {
    // Both dependencies are only there when the filter has been constructed
    reply(host, 500, {
      ...this.errorBody.get(),
      ...this.transientErrorBody.get(),
    });
  }
}

@Catch()
@Injectable()
class RequestAwareFilter implements ExceptionFilter {
  constructor(@Inject(REQUEST) private readonly req: { url: string }) {}

  catch(_exception: unknown, host: ArgumentsHost) {
    reply(host, 500, { ...OPAQUE_BODY, url: this.req.url });
  }
}

@Catch(NotFoundException)
@Injectable()
class NotFoundFilter implements ExceptionFilter {
  catch(_exception: NotFoundException, host: ArgumentsHost) {
    reply(host, 404, { error: 'nothing here' });
  }
}

@Catch()
@Injectable()
class SingletonFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const type = exception instanceof HttpException ? 'http' : 'unknown';
    reply(host, 500, { error: `singleton: ${type}` });
  }
}

@Catch()
@Injectable()
class BrokenFilter implements ExceptionFilter {
  constructor() {
    throw new Error('cannot be instantiated');
  }

  catch() {}
}

@Injectable({ scope: Scope.REQUEST })
class Tenant {
  constructor(@Inject(REQUEST) req: { headers: Record<string, string> }) {
    if (req.headers['x-provider-fails']) {
      throw new ForbiddenException(SECRET);
    }
  }
}

@Injectable()
class StaticMiddleware implements NestMiddleware {
  use(req: { headers: Record<string, string> }, _res: unknown, next: Function) {
    if (req.headers['x-middleware-fails']) {
      throw new ForbiddenException(SECRET);
    }
    next();
  }
}

@Injectable({ scope: Scope.REQUEST })
class RequestScopedMiddleware implements NestMiddleware {
  use(req: { headers: Record<string, string> }, _res: unknown, next: Function) {
    if (req.headers['x-scoped-middleware-fails']) {
      throw new ForbiddenException(SECRET);
    }
    next();
  }
}

@Controller('reports')
class ReportsController {
  @Get()
  list() {
    throw new ForbiddenException(SECRET);
  }

  @Post()
  create(@Body() report: unknown) {
    return report;
  }
}

@Controller('tenant')
class TenantController {
  constructor(readonly tenant: Tenant) {}

  @Get()
  read() {
    return 'ok';
  }
}

const createApp = async (
  adapter: AbstractHttpAdapter,
  ...filters: Provider[]
) => {
  @Module({
    controllers: [ReportsController, TenantController],
    providers: [ErrorBody, TransientErrorBody, Tenant, ...filters],
  })
  class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
      consumer
        .apply(StaticMiddleware, RequestScopedMiddleware)
        .forRoutes('*path');
    }
  }

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication(adapter);
  app.useLogger(false);
  await app.init();
  await adapter.getInstance().ready?.();
  return app;
};

type Send = (server: any) => request.Test;

const errorSources: [string, Send][] = [
  ['a route handler', server => request(server).get('/reports')],
  [
    'a middleware',
    server => request(server).get('/reports').set('x-middleware-fails', '1'),
  ],
  [
    'a request-scoped middleware',
    server =>
      request(server).get('/reports').set('x-scoped-middleware-fails', '1'),
  ],
  ['the "not found" handler', server => request(server).get('/nope')],
  [
    'the body parser',
    server =>
      request(server)
        .post('/reports')
        .set('content-type', 'application/json')
        .send('{oops'),
  ],
  [
    'a request-scoped provider of the controller',
    server => request(server).get('/tenant').set('x-provider-fails', '1'),
  ],
];

describe.each<[string, () => AbstractHttpAdapter]>([
  ['Express', () => new ExpressAdapter()],
  ['Fastify', () => new FastifyAdapter()],
])('Scoped global filters (%s)', (_, createAdapter) => {
  let app: INestApplication;

  afterEach(async () => {
    await app?.close();
  });

  describe.each<[string, Provider]>([
    [
      'request-scoped',
      { provide: APP_FILTER, useClass: OpaqueFilter, scope: Scope.REQUEST },
    ],
    [
      'transient',
      { provide: APP_FILTER, useClass: OpaqueFilter, scope: Scope.TRANSIENT },
    ],
    [
      'request-scoped (factory)',
      {
        provide: APP_FILTER,
        useFactory: (body: ErrorBody, transientBody: TransientErrorBody) =>
          new OpaqueFilter(body, transientBody),
        inject: [ErrorBody, TransientErrorBody],
        scope: Scope.REQUEST,
      },
    ],
  ])('when the filter is %s', (__, filter) => {
    it.each(errorSources)(
      'should handle an exception thrown by %s',
      async (___, send) => {
        app = await createApp(createAdapter(), filter);

        await send(app.getHttpServer()).expect(500, OPAQUE_BODY);
      },
    );
  });

  it.each(errorSources.slice(1, 5))(
    'should inject the request that has failed (%s)',
    async (__, send) => {
      app = await createApp(createAdapter(), {
        provide: APP_FILTER,
        useClass: RequestAwareFilter,
        scope: Scope.REQUEST,
      });

      const first = await send(app.getHttpServer()).query({ n: 1 }).expect(500);
      const second = await send(app.getHttpServer())
        .query({ n: 2 })
        .expect(500);

      expect(first.body.url).toMatch(/\?n=1$/);
      expect(second.body.url).toMatch(/\?n=2$/);
    },
  );

  it('should respect the exception types of the filter', async () => {
    app = await createApp(
      createAdapter(),
      { provide: APP_FILTER, useClass: SingletonFilter },
      { provide: APP_FILTER, useClass: NotFoundFilter, scope: Scope.REQUEST },
    );

    await request(app.getHttpServer())
      .get('/nope')
      .expect(404, { error: 'nothing here' });
    await request(app.getHttpServer())
      .get('/reports')
      .set('x-middleware-fails', '1')
      .expect(500, { error: 'singleton: http' });
  });

  describe('when the filter cannot be instantiated', () => {
    const brokenFilter: Provider = {
      provide: APP_FILTER,
      useClass: BrokenFilter,
      scope: Scope.REQUEST,
    };

    it.each(errorSources)(
      'should fail with that error instead of the one thrown by %s',
      async (__, send) => {
        app = await createApp(createAdapter(), brokenFilter);

        await send(app.getHttpServer()).expect(500, {
          statusCode: 500,
          message: 'Internal server error',
        });
      },
    );

    it('should pass that error to the filters without a scope', async () => {
      app = await createApp(createAdapter(), brokenFilter, {
        provide: APP_FILTER,
        useClass: SingletonFilter,
      });

      await request(app.getHttpServer())
        .get('/reports')
        .set('x-middleware-fails', '1')
        .expect(500, { error: 'singleton: unknown' });
    });
  });
});
