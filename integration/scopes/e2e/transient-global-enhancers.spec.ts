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
  Injectable,
  Module,
  NestInterceptor,
  PipeTransform,
  Provider,
  Scope,
  Type,
  UseGuards,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import {
  ClientProxy,
  ClientProxyFactory,
  MessagePattern,
  MicroserviceOptions,
  Payload,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { firstValueFrom, of } from 'rxjs';
import { map } from 'rxjs/operators';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

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
  await listenOnLoopback(app);
  return app;
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
        expect(instancesByController.get('FirstController')?.size).toBe(1);
        expect(instancesByController.get('SecondController')?.size).toBe(1);
        expect(
          new Set([
            ...(instancesByController.get('FirstController') ??
              new Set<number>()),
            ...(instancesByController.get('SecondController') ??
              new Set<number>()),
          ]).size,
        ).toBe(2);
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
        expect(instancesByController.get('GuardedFirstController')?.size).toBe(
          1,
        );
        expect(instancesByController.get('GuardedSecondController')?.size).toBe(
          1,
        );
        expect(
          new Set([
            ...(instancesByController.get('GuardedFirstController') ??
              new Set<number>()),
            ...(instancesByController.get('GuardedSecondController') ??
              new Set<number>()),
          ]).size,
        ).toBe(2);
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

        expect(text).toBe('hello-piped');
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

        expect(text).toBe('intercepted:ok');
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

        expect(text).toBe('handled');
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

      await expect(firstValueFrom(client.send('read', {}))).rejects.toEqual({
        status: 'error',
        message: 'Forbidden resource',
      });
    });

    it('should transform the payload when the global pipe is transient', async () => {
      await listen([{ provide: APP_PIPE, useClass: SuffixPipe }]);

      await expect(firstValueFrom(client.send('echo', 'nest'))).resolves.toBe(
        'nest-piped',
      );
    });

    it('should wrap the response when the global interceptor is transient', async () => {
      await listen([{ provide: APP_INTERCEPTOR, useClass: PrefixInterceptor }]);

      await expect(firstValueFrom(client.send('read', {}))).resolves.toBe(
        'intercepted:ok',
      );
    });

    it('should handle the error when the global filter is transient', async () => {
      await listen([{ provide: APP_FILTER, useClass: RecoveringRpcFilter }]);

      await expect(firstValueFrom(client.send('fail', {}))).resolves.toBe(
        'recovered',
      );
    });
  });
});
