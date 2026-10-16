import {
  ArgumentsHost,
  CallHandler,
  CanActivate,
  Catch,
  Controller,
  ExceptionFilter,
  ExecutionContext,
  Get,
  INestApplication,
  Injectable,
  NestInterceptor,
  PipeTransform,
  Query,
  Scope,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

const calls: string[] = [];

function createEnhancer(name: string, scope: Scope) {
  @Catch()
  @Injectable({ scope })
  class OrderEnhancer
    implements CanActivate, NestInterceptor, PipeTransform, ExceptionFilter
  {
    canActivate() {
      calls.push(name);
      return true;
    }

    intercept(_context: ExecutionContext, next: CallHandler) {
      calls.push(name);
      return next.handle();
    }

    transform(value: unknown) {
      calls.push(name);
      return value;
    }

    catch(_exception: unknown, host: ArgumentsHost) {
      host.switchToHttp().getResponse().status(418).json({ handledBy: name });
    }
  }
  return OrderEnhancer;
}

@Controller('order')
class OrderController {
  @Get()
  getCalls(@Query('value') _value: string) {
    return calls;
  }

  @Get('error')
  throwError() {
    throw new Error('unhandled');
  }
}

const scopes = {
  DEFAULT: Scope.DEFAULT,
  REQUEST: Scope.REQUEST,
  TRANSIENT: Scope.TRANSIENT,
};
type ScopeName = keyof typeof scopes;
const scopeNames = Object.keys(scopes) as ScopeName[];
const scopePairs = scopeNames.flatMap(first =>
  scopeNames.map(second => [first, second]),
);

describe('Global enhancers order', () => {
  let app: INestApplication;

  async function createApp(
    token: string,
    first: ScopeName,
    second: ScopeName | undefined,
    bindAfterProviders: (app: INestApplication) => void,
  ) {
    const providers = [
      { provide: token, useClass: createEnhancer('first', scopes[first]) },
    ];
    if (second) {
      providers.push({
        provide: token,
        useClass: createEnhancer('second', scopes[second]),
      });
    }
    const moduleRef = await Test.createTestingModule({
      controllers: [OrderController],
      providers,
    }).compile();
    app = moduleRef.createNestApplication();
    // Bound after the providers, so it comes after them
    bindAfterProviders(app);
    await app.init();
  }

  afterEach(async () => {
    calls.length = 0;
    await app.close();
  });

  describe.each([
    [APP_GUARD, (app: INestApplication, guard) => app.useGlobalGuards(guard)],
    [
      APP_INTERCEPTOR,
      (app: INestApplication, interceptor) =>
        app.useGlobalInterceptors(interceptor),
    ],
    [APP_PIPE, (app: INestApplication, pipe) => app.useGlobalPipes(pipe)],
  ])('%s', (token, useGlobal) => {
    it.each(scopePairs)(
      'should run %s and %s scoped providers in binding order',
      async (first, second) => {
        await createApp(token, first, second, app =>
          useGlobal(app, new (createEnhancer('third', Scope.DEFAULT))()),
        );

        await request(app.getHttpServer())
          .get('/order?value=1')
          .expect(200, ['first', 'second', 'third']);
      },
    );
  });

  describe(APP_FILTER, () => {
    it.each(scopePairs)(
      'should let the filter bound last handle an exception for %s and %s scoped providers',
      async (first, second) => {
        await createApp(APP_FILTER, first, second, () => {});

        await request(app.getHttpServer())
          .get('/order/error')
          .expect(418, { handledBy: 'second' });
      },
    );

    it.each(scopeNames)(
      'should let a filter passed to useGlobalFilters() take precedence over a %s scoped provider',
      async first => {
        await createApp(APP_FILTER, first, undefined, app =>
          app.useGlobalFilters(new (createEnhancer('third', Scope.DEFAULT))()),
        );

        await request(app.getHttpServer())
          .get('/order/error')
          .expect(418, { handledBy: 'third' });
      },
    );
  });
});
