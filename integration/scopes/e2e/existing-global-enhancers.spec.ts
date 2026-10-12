import {
  ArgumentsHost,
  CallHandler,
  CanActivate,
  Catch,
  Controller,
  createParamDecorator,
  ExceptionFilter,
  ExecutionContext,
  Get,
  Inject,
  INestApplication,
  INestMicroservice,
  Injectable,
  Module,
  NestInterceptor,
  PipeTransform,
  Provider,
  Scope,
  Type,
} from '@nestjs/common';
import {
  APP_FILTER,
  APP_GUARD,
  APP_INTERCEPTOR,
  APP_PIPE,
  REQUEST,
} from '@nestjs/core';
import {
  ClientProxy,
  ClientProxyFactory,
  MessagePattern,
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

const TCP_PORT = 3793;

@Injectable({ scope: Scope.REQUEST })
class RequestScopedDenyGuard implements CanActivate {
  canActivate() {
    return false;
  }
}

@Injectable({ scope: Scope.TRANSIENT })
class TransientDenyGuard implements CanActivate {
  canActivate() {
    return false;
  }
}

@Injectable()
class DefaultDenyGuard implements CanActivate {
  canActivate() {
    return false;
  }
}

@Injectable({ scope: Scope.REQUEST })
class CurrentRequest {
  constructor(@Inject(REQUEST) readonly request: unknown) {}
}

// Request-scoped only through its dependency.
@Injectable()
class ImplicitlyScopedDenyGuard implements CanActivate {
  constructor(private readonly current: CurrentRequest) {}

  canActivate() {
    return !this.current.request;
  }
}

@Injectable({ scope: Scope.REQUEST })
class SuffixPipe implements PipeTransform {
  transform(value: string) {
    return `${value}-piped`;
  }
}

@Injectable({ scope: Scope.REQUEST })
class PrefixInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map(data => `intercepted:${data}`));
  }
}

@Catch()
@Injectable({ scope: Scope.REQUEST })
class TeapotFilter implements ExceptionFilter {
  catch(_error: unknown, host: ArgumentsHost) {
    host.switchToHttp().getResponse().status(418).send('handled');
  }
}

const Greeting = createParamDecorator(() => 'hello');

@Controller('first')
class FirstController {
  @Get()
  read() {
    return 'ok';
  }

  @Get('greeting')
  greet(@Greeting() greeting: string) {
    return greeting;
  }

  @Get('fail')
  fail() {
    throw new Error('boom');
  }
}

@Controller()
class MessageController {
  @MessagePattern('read')
  read() {
    return 'ok';
  }
}

const createModule = (
  providers: Provider[],
  controllers: Type<unknown>[] = [FirstController],
) => {
  @Module({ controllers, providers: [CurrentRequest, ...providers] })
  class TestModule {}
  return TestModule;
};

const compile = (module: Type<unknown>) =>
  Test.createTestingModule({ imports: [module] }).compile();

const createApp = async (module: Type<unknown>) => {
  const moduleRef = await compile(module);
  const app = moduleRef.createNestApplication();
  await listenOnLoopback(app);
  return app;
};

describe('Global enhancers registered with useExisting or useFactory', () => {
  describe('http', () => {
    let app: INestApplication;

    afterEach(async () => {
      await app?.close();
    });

    it('should deny the request when the global guard is an alias of a request-scoped guard', async () => {
      app = await createApp(
        createModule([
          RequestScopedDenyGuard,
          { provide: APP_GUARD, useExisting: RequestScopedDenyGuard },
        ]),
      );

      await request(app.getHttpServer()).get('/first').expect(403);
    });

    it('should deny the request when the global guard is an alias of a transient guard', async () => {
      app = await createApp(
        createModule([
          TransientDenyGuard,
          { provide: APP_GUARD, useExisting: TransientDenyGuard },
        ]),
      );

      await request(app.getHttpServer()).get('/first').expect(403);
    });

    it('should deny the request when the global guard is an alias of a default provider', async () => {
      app = await createApp(
        createModule([
          DefaultDenyGuard,
          { provide: APP_GUARD, useExisting: DefaultDenyGuard },
        ]),
      );

      await request(app.getHttpServer()).get('/first').expect(403);
    });

    it('should deny the request when a request-scoped factory returns the global guard', async () => {
      app = await createApp(
        createModule([
          {
            provide: APP_GUARD,
            useFactory: (current: CurrentRequest) =>
              new ImplicitlyScopedDenyGuard(current),
            inject: [CurrentRequest],
            scope: Scope.REQUEST,
          },
        ]),
      );

      await request(app.getHttpServer()).get('/first').expect(403);
    });

    it('should transform the parameter when the global pipe is an alias of a request-scoped pipe', async () => {
      app = await createApp(
        createModule([
          SuffixPipe,
          { provide: APP_PIPE, useExisting: SuffixPipe },
        ]),
      );

      const { text } = await request(app.getHttpServer())
        .get('/first/greeting')
        .expect(200);

      expect(text).toBe('hello-piped');
    });

    it('should wrap the response when the global interceptor is an alias of a request-scoped interceptor', async () => {
      app = await createApp(
        createModule([
          PrefixInterceptor,
          { provide: APP_INTERCEPTOR, useExisting: PrefixInterceptor },
        ]),
      );

      const { text } = await request(app.getHttpServer())
        .get('/first')
        .expect(200);

      expect(text).toBe('intercepted:ok');
    });

    it('should handle the error when the global filter is an alias of a request-scoped filter', async () => {
      app = await createApp(
        createModule([
          TeapotFilter,
          { provide: APP_FILTER, useExisting: TeapotFilter },
        ]),
      );

      const { text } = await request(app.getHttpServer())
        .get('/first/fail')
        .expect(418);

      expect(text).toBe('handled');
    });

    it('should still skip a global guard factory that returns nothing', async () => {
      app = await createApp(
        createModule([{ provide: APP_GUARD, useFactory: () => null }]),
      );

      await request(app.getHttpServer()).get('/first').expect(200);
    });
  });

  describe('when the enhancer is request-scoped only through its dependencies', () => {
    it('should fail at startup for an alias', async () => {
      await expect(
        compile(
          createModule([
            ImplicitlyScopedDenyGuard,
            { provide: APP_GUARD, useExisting: ImplicitlyScopedDenyGuard },
          ]),
        ),
      ).rejects.toThrow(
        'The APP_GUARD provider (useExisting: ImplicitlyScopedDenyGuard) depends on a request-scoped provider, so it would never run. Point "useExisting" at a class marked with @Injectable({ scope: Scope.REQUEST }), or use a factory provider with "scope: Scope.REQUEST".',
      );
    });

    it('should fail at startup for an alias of a token', async () => {
      await expect(
        compile(
          createModule([
            { provide: 'AUTH_GUARD', useClass: RequestScopedDenyGuard },
            { provide: APP_GUARD, useExisting: 'AUTH_GUARD' },
          ]),
        ),
      ).rejects.toThrow(
        'The APP_GUARD provider (useExisting: AUTH_GUARD) depends on a request-scoped provider, so it would never run.',
      );
    });

    it('should fail at startup for a factory', async () => {
      await expect(
        compile(
          createModule([
            {
              provide: APP_GUARD,
              useFactory: (current: CurrentRequest) =>
                new ImplicitlyScopedDenyGuard(current),
              inject: [CurrentRequest],
            },
          ]),
        ),
      ).rejects.toThrow(
        'The APP_GUARD provider (useFactory) depends on a request-scoped provider, so it would never run. Set "scope: Scope.REQUEST" on the factory provider.',
      );
    });
  });

  describe('microservice', () => {
    let microservice: INestMicroservice;
    let client: ClientProxy;

    afterEach(async () => {
      await client?.close();
      await microservice?.close();
    });

    it('should deny the message when the global guard is an alias of a request-scoped guard', async () => {
      const moduleRef = await compile(
        createModule(
          [
            RequestScopedDenyGuard,
            { provide: APP_GUARD, useExisting: RequestScopedDenyGuard },
          ],
          [MessageController],
        ),
      );
      microservice = moduleRef.createNestMicroservice<MicroserviceOptions>({
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: TCP_PORT },
      });
      await microservice.listen();
      client = ClientProxyFactory.create({
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: TCP_PORT },
      });
      await client.connect();

      await expect(firstValueFrom(client.send('read', {}))).rejects.toEqual({
        status: 'error',
        message: 'Forbidden resource',
      });
    });
  });
});
