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
  INestApplication,
  INestMicroservice,
  Inject,
  Injectable,
  Module,
  NestInterceptor,
  PipeTransform,
  Provider,
  Scope,
  SetMetadata,
  Type,
  UseGuards,
} from '@nestjs/common';
import { ENTRY_PROVIDER_WATERMARK } from '@nestjs/common/constants';
import {
  APP_FILTER,
  APP_GUARD,
  APP_INTERCEPTOR,
  APP_PIPE,
  ExternalContextCreator,
} from '@nestjs/core';
import {
  ClientProxy,
  ClientProxyFactory,
  MessagePattern,
  MicroserviceOptions,
  Payload,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { expect } from 'chai';
import { firstValueFrom, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { io } from 'socket.io-client';
import * as request from 'supertest';

const TCP_PORT = 3792;

@Injectable()
class Gate {
  isOpen() {
    return false;
  }
}

@Injectable({ scope: Scope.TRANSIENT })
class TransientDenyGuard implements CanActivate {
  constructor(private readonly gate: Gate) {}

  canActivate() {
    return this.gate.isOpen();
  }
}

@Injectable()
class DefaultDenyGuard implements CanActivate {
  canActivate() {
    return false;
  }
}

@Injectable({ scope: Scope.REQUEST })
class RequestScopedDenyGuard implements CanActivate {
  canActivate() {
    return false;
  }
}

@Injectable({ scope: Scope.TRANSIENT })
class TrackingGuard implements CanActivate {
  static instanceCount = 0;
  static readonly instancesByController = new Map<string, Set<number>>();
  private readonly instanceId = ++TrackingGuard.instanceCount;

  static reset() {
    TrackingGuard.instanceCount = 0;
    TrackingGuard.instancesByController.clear();
  }

  canActivate(context: ExecutionContext) {
    const controller = context.getClass().name;
    const known =
      TrackingGuard.instancesByController.get(controller) ?? new Set<number>();
    TrackingGuard.instancesByController.set(
      controller,
      known.add(this.instanceId),
    );
    return true;
  }
}

@Injectable({ scope: Scope.TRANSIENT })
class TrackingDenyGuard extends TrackingGuard {
  constructor(private readonly gate: Gate) {
    super();
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context) && this.gate.isOpen();
  }
}

@Injectable({ scope: Scope.TRANSIENT })
class SuffixPipe implements PipeTransform {
  transform(value: string) {
    return `${value}-piped`;
  }
}

@Injectable({ scope: Scope.TRANSIENT })
class PrefixInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map(data => `intercepted:${data}`));
  }
}

@Catch()
@Injectable({ scope: Scope.TRANSIENT })
class TeapotFilter implements ExceptionFilter {
  catch(_error: unknown, host: ArgumentsHost) {
    host.switchToHttp().getResponse().status(418).send('handled');
  }
}

@Catch()
@Injectable({ scope: Scope.TRANSIENT })
class RecoveringRpcFilter implements ExceptionFilter {
  catch() {
    return of('recovered');
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

@Controller('second')
class SecondController {
  @Get()
  read() {
    return 'ok';
  }
}

@Controller('guarded-first')
class GuardedFirstController {
  @Get()
  @UseGuards(TrackingDenyGuard)
  read() {
    return 'ok';
  }
}

@Controller('guarded-second')
class GuardedSecondController {
  @Get()
  @UseGuards(TrackingDenyGuard)
  read() {
    return 'ok';
  }
}

@Controller()
class MessageController {
  @MessagePattern('read')
  read() {
    return 'ok';
  }

  @MessagePattern('echo')
  echo(@Payload() name: string) {
    return name;
  }

  @MessagePattern('fail')
  fail() {
    throw new Error('boom');
  }
}

// Marked the way `@Resolver()` of @nestjs/graphql marks a resolver.
@Injectable()
@SetMetadata(ENTRY_PROVIDER_WATERMARK, true)
class EntryProvider {
  constructor(@Inject('SLOW') _slow: unknown) {}

  read() {
    return 'ok';
  }

  @UseGuards(TrackingDenyGuard)
  guarded() {
    return 'ok';
  }
}

@Injectable()
class EntryProviderConsumer {
  constructor(readonly entryProvider: EntryProvider) {}
}

@Injectable({ scope: Scope.TRANSIENT })
class EntryProviderConsumerGuard implements CanActivate {
  constructor(private readonly consumer: EntryProviderConsumer) {}

  canActivate() {
    return !this.consumer.entryProvider;
  }
}

@Injectable({ scope: Scope.TRANSIENT })
class TransientArrowDenyGuard implements CanActivate {
  constructor(private readonly gate: Gate) {}

  // An instance property, so a guard whose constructor never ran has none.
  canActivate = () => this.gate.isOpen();
}

@WebSocketGateway()
class TransientGuardedGateway {
  @UseGuards(TransientArrowDenyGuard)
  @SubscribeMessage('arrow')
  arrow() {
    return { event: 'arrow', data: 'granted' };
  }

  @UseGuards(TrackingDenyGuard)
  @SubscribeMessage('method')
  method() {
    return { event: 'method', data: 'granted' };
  }
}

const createModule = (
  providers: Provider[],
  controllers: Type<unknown>[] = [FirstController],
) => {
  @Module({ controllers, providers: [Gate, ...providers] })
  class TestModule {}
  return TestModule;
};

const createApp = async (module: Type<unknown>) => {
  const moduleRef = await Test.createTestingModule({
    imports: [module],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.listen(0, '127.0.0.1');
  return app;
};

const getError = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
  } catch (err) {
    return err as Error;
  }
  return undefined;
};

describe('Transient global enhancers', () => {
  describe('http', () => {
    let app: INestApplication;

    afterEach(async () => {
      await app?.close();
    });

    describe('guard', () => {
      it('should deny the request when the global guard is transient', async () => {
        app = await createApp(
          createModule([{ provide: APP_GUARD, useClass: TransientDenyGuard }]),
        );

        await request(app.getHttpServer()).get('/first').expect(403);
      });

      it('should deny the request when the global guard is a default provider', async () => {
        app = await createApp(
          createModule([{ provide: APP_GUARD, useClass: DefaultDenyGuard }]),
        );

        await request(app.getHttpServer()).get('/first').expect(403);
      });

      it('should deny the request when the global guard is request scoped', async () => {
        app = await createApp(
          createModule([
            { provide: APP_GUARD, useClass: RequestScopedDenyGuard },
          ]),
        );

        await request(app.getHttpServer()).get('/first').expect(403);
      });

      it('should give each controller its own instance and keep it across requests', async () => {
        TrackingGuard.reset();
        app = await createApp(
          createModule(
            [{ provide: APP_GUARD, useClass: TrackingGuard }],
            [FirstController, SecondController],
          ),
        );
        const server = app.getHttpServer();

        await request(server).get('/first').expect(200);
        await request(server).get('/first').expect(200);
        await request(server).get('/second').expect(200);
        await request(server).get('/second').expect(200);

        const { instancesByController } = TrackingGuard;
        expect(instancesByController.get('FirstController')?.size).to.equal(1);
        expect(instancesByController.get('SecondController')?.size).to.equal(1);
        expect(
          new Set([
            ...(instancesByController.get('FirstController') ??
              new Set<number>()),
            ...(instancesByController.get('SecondController') ??
              new Set<number>()),
          ]).size,
        ).to.equal(2);
      });
    });

    describe('method level guard', () => {
      it('should give each controller its own constructed instance of a transient guard', async () => {
        TrackingGuard.reset();
        app = await createApp(
          createModule([], [GuardedFirstController, GuardedSecondController]),
        );
        const server = app.getHttpServer();

        await request(server).get('/guarded-first').expect(403);
        await request(server).get('/guarded-first').expect(403);
        await request(server).get('/guarded-second').expect(403);
        await request(server).get('/guarded-second').expect(403);

        const { instancesByController } = TrackingGuard;
        expect(
          instancesByController.get('GuardedFirstController')?.size,
        ).to.equal(1);
        expect(
          instancesByController.get('GuardedSecondController')?.size,
        ).to.equal(1);
        expect(
          new Set([
            ...(instancesByController.get('GuardedFirstController') ??
              new Set<number>()),
            ...(instancesByController.get('GuardedSecondController') ??
              new Set<number>()),
          ]).size,
        ).to.equal(2);
      });
    });

    describe('pipe', () => {
      it('should transform the parameter when the global pipe is transient', async () => {
        app = await createApp(
          createModule([{ provide: APP_PIPE, useClass: SuffixPipe }]),
        );

        const { text } = await request(app.getHttpServer())
          .get('/first/greeting')
          .expect(200);

        expect(text).to.equal('hello-piped');
      });
    });

    describe('interceptor', () => {
      it('should wrap the response when the global interceptor is transient', async () => {
        app = await createApp(
          createModule([
            { provide: APP_INTERCEPTOR, useClass: PrefixInterceptor },
          ]),
        );

        const { text } = await request(app.getHttpServer())
          .get('/first')
          .expect(200);

        expect(text).to.equal('intercepted:ok');
      });
    });

    describe('exception filter', () => {
      it('should handle the error when the global filter is transient', async () => {
        app = await createApp(
          createModule([{ provide: APP_FILTER, useClass: TeapotFilter }]),
        );

        const { text } = await request(app.getHttpServer())
          .get('/first/fail')
          .expect(418);

        expect(text).to.equal('handled');
      });
    });
  });

  describe('microservice', () => {
    let microservice: INestMicroservice;
    let client: ClientProxy;

    const listen = async (providers: Provider[]) => {
      const moduleRef = await Test.createTestingModule({
        imports: [createModule(providers, [MessageController])],
      }).compile();
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
    };

    afterEach(async () => {
      await client?.close();
      await microservice?.close();
    });

    it('should deny the message when the global guard is transient', async () => {
      await listen([{ provide: APP_GUARD, useClass: TransientDenyGuard }]);

      let error: unknown;
      try {
        await firstValueFrom(client.send('read', {}));
      } catch (err) {
        error = err;
      }
      expect(error).to.deep.equal({
        status: 'error',
        message: 'Forbidden resource',
      });
    });

    it('should transform the payload when the global pipe is transient', async () => {
      await listen([{ provide: APP_PIPE, useClass: SuffixPipe }]);

      expect(await firstValueFrom(client.send('echo', 'nest'))).to.equal(
        'nest-piped',
      );
    });

    it('should wrap the response when the global interceptor is transient', async () => {
      await listen([{ provide: APP_INTERCEPTOR, useClass: PrefixInterceptor }]);

      expect(await firstValueFrom(client.send('read', {}))).to.equal(
        'intercepted:ok',
      );
    });

    it('should handle the error when the global filter is transient', async () => {
      await listen([{ provide: APP_FILTER, useClass: RecoveringRpcFilter }]);

      expect(await firstValueFrom(client.send('fail', {}))).to.equal(
        'recovered',
      );
    });
  });

  // Handlers built the way @nestjs/graphql builds those of a static resolver
  describe('entry provider', () => {
    let app: INestApplication;

    const createHandler = async (
      providers: Provider[],
      methodName: 'read' | 'guarded' = 'read',
    ) => {
      app = await createApp(
        createModule(
          [
            ...providers,
            EntryProvider,
            {
              provide: 'SLOW',
              useFactory: () => new Promise(resolve => setTimeout(resolve, 10)),
            },
          ],
          [],
        ),
      );
      const instance = app.get(EntryProvider);
      return app
        .get(ExternalContextCreator)
        .create(instance, instance[methodName], methodName);
    };

    afterEach(async () => {
      await app?.close();
    });

    it('should deny the call when the global guard is transient', async () => {
      const handler = await createHandler([
        { provide: APP_GUARD, useClass: TransientDenyGuard },
      ]);

      const error = await getError(() => handler());
      expect(error?.message).to.equal('Forbidden resource');
    });

    it('should wrap the result when the global interceptor is transient', async () => {
      const handler = await createHandler([
        { provide: APP_INTERCEPTOR, useClass: PrefixInterceptor },
      ]);

      expect(await handler()).to.equal('intercepted:ok');
    });

    it('should give the provider a constructed instance of a method level transient guard', async () => {
      const handler = await createHandler([], 'guarded');

      const error = await getError(() => handler());
      expect(error?.message).to.equal('Forbidden resource');
    });

    it('should bootstrap when the guard depends on a provider that waits for the entry provider', async () => {
      const handler = await createHandler([
        EntryProviderConsumer,
        { provide: APP_GUARD, useClass: EntryProviderConsumerGuard },
      ]);

      const error = await getError(() => handler());
      expect(error?.message).to.equal('Forbidden resource');
    });
  });

  // A default-scoped gateway with no scoped global enhancers builds its
  // handlers once, in the static context.
  describe('gateway', () => {
    let app: INestApplication;

    afterEach(async () => {
      await app?.close();
    });

    const send = async (event: 'arrow' | 'method') => {
      const moduleRef = await Test.createTestingModule({
        imports: [createModule([TransientGuardedGateway], [])],
      }).compile();
      app = moduleRef.createNestApplication({ logger: false });
      await app.listen(0, '127.0.0.1');

      const client = io(await app.getUrl(), { transports: ['websocket'] });
      const reply = new Promise<{ event: string; data: any }>(resolve => {
        client.once('exception', data => resolve({ event: 'exception', data }));
        client.once(event, data => resolve({ event, data }));
      });
      client.emit(event, {});
      try {
        return await reply;
      } finally {
        client.close();
      }
    };

    (['arrow', 'method'] as const).forEach(event => {
      it(`should deny the message with a transient guard bound by class (${event})`, async () => {
        const reply = await send(event);

        expect(reply.event).to.equal('exception');
        expect(reply.data.message).to.equal('Forbidden resource');
      });
    });
  });
});
