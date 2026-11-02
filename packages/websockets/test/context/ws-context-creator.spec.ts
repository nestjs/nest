import { ApplicationConfig } from '@nestjs/core/application-config.js';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import {
  firstValueFrom,
  isObservable,
  lastValueFrom,
  Observable,
  of,
  switchMap,
  throwError,
  toArray,
} from 'rxjs';
import { CUSTOM_ROUTE_ARGS_METADATA } from '../../../common/constants.js';
import { Injectable, UseGuards, UsePipes } from '../../../common/index.js';
import { GuardsConsumer } from '../../../core/guards/guards-consumer.js';
import { GuardsContextCreator } from '../../../core/guards/guards-context-creator.js';
import { STATIC_CONTEXT } from '../../../core/injector/constants.js';
import { NestContainer } from '../../../core/injector/container.js';
import { InstanceWrapper } from '../../../core/injector/instance-wrapper.js';
import { InterceptorsConsumer } from '../../../core/interceptors/interceptors-consumer.js';
import { InterceptorsContextCreator } from '../../../core/interceptors/interceptors-context-creator.js';
import { PipesConsumer } from '../../../core/pipes/pipes-consumer.js';
import { PipesContextCreator } from '../../../core/pipes/pipes-context-creator.js';
import { MESSAGE_METADATA } from '../../constants.js';
import { ExceptionFiltersContext } from '../../context/exception-filters-context.js';
import { WsContextCreator } from '../../context/ws-context-creator.js';
import { WsProxy } from '../../context/ws-proxy.js';
import { WsParamtype } from '../../enums/ws-paramtype.enum.js';
import { WsParamsFactory } from '../../factories/ws-params-factory.js';
import { WsExceptionsHandler } from '../../exceptions/ws-exceptions-handler.js';
import { MessageBody, WsException } from '../../index.js';

@Injectable()
class TestGuard {
  canActivate: () => true;
}

@Injectable()
class TestPipe {
  transform(val) {
    return val;
  }
}

describe('WsContextCreator', () => {
  let contextCreator: WsContextCreator;
  let wsProxy: WsProxy;
  let exceptionFiltersContext: ExceptionFiltersContext;
  let pipesCreator: PipesContextCreator;
  let pipesConsumer: PipesConsumer;
  let guardsContextCreator: GuardsContextCreator;
  let guardsConsumer: GuardsConsumer;
  let instance: Test;
  let module: string;

  @UseGuards(TestGuard)
  @Injectable()
  class Test {
    @UsePipes(new TestPipe())
    test(client: string, data: number) {
      return of(false);
    }
  }

  beforeEach(() => {
    wsProxy = new WsProxy();
    vi.spyOn(wsProxy, 'create').mockImplementation(a => a);

    exceptionFiltersContext = new ExceptionFiltersContext(
      new NestContainer() as any,
    );
    pipesCreator = new PipesContextCreator(new NestContainer() as any);
    pipesConsumer = new PipesConsumer();
    guardsContextCreator = new GuardsContextCreator(new NestContainer());
    guardsConsumer = new GuardsConsumer();
    contextCreator = new WsContextCreator(
      wsProxy,
      exceptionFiltersContext,
      pipesCreator as any,
      pipesConsumer as any,
      guardsContextCreator as any,
      guardsConsumer as any,
      new InterceptorsContextCreator(new NestContainer()) as any,
      new InterceptorsConsumer() as any,
    );

    instance = new Test();
    module = 'test';
  });
  describe('create', () => {
    it('should create exception handler', () => {
      const handlerCreateSpy = vi.spyOn(exceptionFiltersContext, 'create');
      contextCreator.create(instance, instance.test, module, 'create');
      expect(handlerCreateSpy).toHaveBeenCalledWith(
        instance,
        instance.test as any,
        module,
        STATIC_CONTEXT,
        undefined,
      );
    });
    it('should create pipes context', () => {
      const pipesCreateSpy = vi.spyOn(pipesCreator, 'create');
      contextCreator.create(instance, instance.test, module, 'create');
      expect(pipesCreateSpy).toHaveBeenCalledWith(
        instance,
        instance.test,
        module,
        STATIC_CONTEXT,
        undefined,
      );
    });
    it('should create guards context', () => {
      const guardsCreateSpy = vi.spyOn(guardsContextCreator, 'create');
      contextCreator.create(instance, instance.test, module, 'create');
      expect(guardsCreateSpy).toHaveBeenCalledWith(
        instance,
        instance.test,
        module,
        STATIC_CONTEXT,
        undefined,
      );
    });
    describe('when proxy called', () => {
      it('should call guards consumer `tryActivate`', async () => {
        const tryActivateSpy = vi.spyOn(guardsConsumer, 'tryActivate');
        vi.spyOn(guardsContextCreator, 'create').mockImplementation(
          () => [{ canActivate: () => true }] as any,
        );
        const proxy = contextCreator.create(
          instance,
          instance.test,
          module,
          'test',
        );
        const data = 'test';
        await proxy(null, data);

        expect(tryActivateSpy).toHaveBeenCalled();
      });
      describe('when can not activate', () => {
        it('should throw forbidden exception', () => {
          vi.spyOn(guardsConsumer, 'tryActivate').mockImplementation(
            async () => false,
          );
          const proxy = contextCreator.create(
            instance,
            instance.test,
            module,
            'test',
          );
          const data = 'test';
          proxy(null, data).catch(err =>
            expect(err).toBeInstanceOf(WsException),
          );
        });
      });
    });
    describe('when two gateways have the same class name', () => {
      const createChatGateway = (field: string) => {
        class ChatGateway {
          handle(@MessageBody(field) value: unknown) {
            return value;
          }
        }
        return ChatGateway;
      };

      it('should pass each gateway its own message body', async () => {
        const chat = new (createChatGateway('text'))();
        const orders = new (createChatGateway('orderId'))();
        const chatProxy = contextCreator.create(
          chat,
          chat.handle,
          module,
          'handle',
        );
        const ordersProxy = contextCreator.create(
          orders,
          orders.handle,
          module,
          'handle',
        );
        const data = { text: 'hello', orderId: 42 };

        expect(await chatProxy(null, data)).toBe('hello');
        expect(await ordersProxy(null, data)).toBe(42);
      });
      it('should reuse the cached metadata for the same gateway class', () => {
        const ChatGateway = createChatGateway('text');
        const metadata = contextCreator.getMetadata(
          new ChatGateway(),
          'handle',
          'ws',
        );

        expect(
          contextCreator.getMetadata(new ChatGateway(), 'handle', 'ws'),
        ).toBe(metadata);
      });
    });
    describe('when the "constructor" of the gateway prototype was overwritten', () => {
      it('should apply the class-level guards of the registered class', async () => {
        class Mixin {}
        @UseGuards({ canActivate: () => false })
        class MixedIn {
          handle() {
            return 'handled';
          }
        }
        // What mixin helpers copying every property of the prototype do
        MixedIn.prototype.constructor = Mixin;
        new InstanceWrapper({ metatype: MixedIn });

        const gateway = new MixedIn();
        const proxy = contextCreator.create(
          gateway,
          gateway.handle,
          module,
          'handle',
        );
        await expect(proxy(null, 'data')).rejects.toBeInstanceOf(WsException);
      });
    });
  });

  describe('reflectCallbackParamtypes', () => {
    it('should return paramtypes array', () => {
      const paramtypes = contextCreator.reflectCallbackParamtypes(
        instance,
        instance.test,
      );
      expect(paramtypes).toEqual([String, Number]);
    });
  });

  describe('createGuardsFn', () => {
    it('should throw exception when "tryActivate" returns false', () => {
      const guardsFn = contextCreator.createGuardsFn([null], null!, null!)!;
      vi.spyOn(guardsConsumer, 'tryActivate').mockImplementation(
        async () => false,
      );
      guardsFn([]).catch(err => expect(err).not.toBeUndefined());
    });
  });

  describe('exchangeKeysForValues', () => {
    it('should exchange arguments keys for appropriate values', () => {
      const metadata = {
        [WsParamtype.SOCKET]: { index: 0, data: 'test', pipes: [] },
        [WsParamtype.PAYLOAD]: { index: 2, data: 'test', pipes: [] },
        [`key${CUSTOM_ROUTE_ARGS_METADATA}`]: {
          index: 3,
          data: 'custom',
          pipes: [],
        },
      };
      const keys = Object.keys(metadata);
      const values = contextCreator.exchangeKeysForValues(
        keys,
        metadata,
        '',
        new WsParamsFactory(),
        (args: unknown[]) => new ExecutionContextHost(args),
      );
      const expectedValues = [
        { index: 0, type: WsParamtype.SOCKET, data: 'test' },
        { index: 2, type: WsParamtype.PAYLOAD, data: 'test' },
        { index: 3, type: `key${CUSTOM_ROUTE_ARGS_METADATA}`, data: 'custom' },
      ];
      expect(values[0]).toMatchObject(expectedValues[0]);
      expect(values[1]).toMatchObject(expectedValues[1]);
    });
  });
  describe('getParamValue', () => {
    let consumerApplySpy: ReturnType<typeof vi.fn>;
    const value = 3,
      metatype = null,
      transforms = [{ transform: vi.fn() }];

    beforeEach(() => {
      consumerApplySpy = vi.spyOn(pipesConsumer, 'apply');
    });
    it('should call "consumer.apply"', async () => {
      await contextCreator.getParamValue(
        value,
        { metatype, type: WsParamtype.PAYLOAD, data: null },
        transforms,
      );
      expect(consumerApplySpy).toHaveBeenCalled();
    });
  });
  describe('createPipesFn', () => {
    describe('when "paramsOptions" is empty', () => {
      it('returns null', async () => {
        const pipesFn = contextCreator.createPipesFn([], []);
        expect(pipesFn).toBeNull();
      });
    });
    describe('when "paramsOptions" is not empty', () => {
      it('returns function', async () => {
        const pipesFn = contextCreator.createPipesFn(
          [],
          [
            {
              index: 1,
              type: 'test',
              data: null!,
              pipes: [],
              extractValue: () => null,
            },
          ],
        )!;
        await pipesFn([]);
        expect(pipesFn).toBeTypeOf('function');
      });
    });
  });
});

describe('WsContextCreator (pattern forwarding)', () => {
  @Injectable()
  class PatternTest {
    handle(client: unknown, data: unknown) {
      return of(true);
    }
  }

  let creator: WsContextCreator;
  let recordedArgs: unknown[];

  beforeEach(() => {
    recordedArgs = [];

    const guardsConsumer = new GuardsConsumer();
    vi.spyOn(guardsConsumer, 'tryActivate').mockImplementation(
      async (_guards, args: any[]) => {
        recordedArgs = [...args];
        return true;
      },
    );

    const guardsContextCreator = new GuardsContextCreator(new NestContainer());
    vi.spyOn(guardsContextCreator, 'create').mockImplementation(
      () => [{ canActivate: () => true }] as any,
    );

    creator = new WsContextCreator(
      // the real proxy, so the pattern it appends is part of the result
      new WsProxy(),
      new ExceptionFiltersContext(new NestContainer() as any),
      new PipesContextCreator(new NestContainer() as any) as any,
      new PipesConsumer() as any,
      guardsContextCreator as any,
      guardsConsumer as any,
      new InterceptorsContextCreator(new NestContainer()) as any,
      new InterceptorsConsumer() as any,
    );
  });

  it('appends the message pattern to the arguments exactly once', async () => {
    const instance = new PatternTest();
    Reflect.defineMetadata(MESSAGE_METADATA, 'myEvent', instance.handle);

    const proxy = creator.create(instance, instance.handle, 'test', 'handle');
    await proxy('client', { some: 'payload' });

    expect(recordedArgs.filter(arg => arg === 'myEvent')).toHaveLength(1);
    expect(recordedArgs[recordedArgs.length - 1]).toEqual('myEvent');
  });

  it('keeps the pattern reachable through getPattern()', async () => {
    const instance = new PatternTest();
    Reflect.defineMetadata(MESSAGE_METADATA, 'myEvent', instance.handle);

    const proxy = creator.create(instance, instance.handle, 'test', 'handle');
    await proxy('client', { some: 'payload' });

    const host = new ExecutionContextHost(recordedArgs);
    expect(host.switchToWs().getPattern()).toEqual('myEvent');
  });
});

describe('WsContextCreator (preRequest hooks)', () => {
  @Injectable()
  class HookGateway {
    onValue(client: unknown, data: unknown) {
      return { client, data };
    }
    onObservable() {
      return of(1, 2);
    }
  }

  let instance: HookGateway;
  let guardsContextCreator: GuardsContextCreator;
  let exceptionFiltersContext: ExceptionFiltersContext;
  let order: string[];

  function createContextCreator(
    hooks: any[],
    wsProxy: WsProxy = Object.assign(new WsProxy(), {
      create: (callback: any) => callback,
    }),
  ) {
    const container = new NestContainer();
    const config = new ApplicationConfig();
    config.registerGatewayPreRequestHook(...hooks);

    guardsContextCreator = new GuardsContextCreator(container);
    vi.spyOn(guardsContextCreator, 'create').mockReturnValue([
      {
        canActivate: () => {
          order.push('guard');
          return true;
        },
      },
    ] as any);
    exceptionFiltersContext = new ExceptionFiltersContext(container);

    return new WsContextCreator(
      wsProxy,
      exceptionFiltersContext,
      new PipesContextCreator(container) as any,
      new PipesConsumer() as any,
      guardsContextCreator as any,
      new GuardsConsumer() as any,
      new InterceptorsContextCreator(container) as any,
      new InterceptorsConsumer() as any,
      config,
    );
  }

  beforeEach(() => {
    instance = new HookGateway();
    order = [];
  });

  it('should not wrap the result when no hooks are registered', async () => {
    const creator = createContextCreator([]);
    const proxy = creator.create(instance, instance.onValue, 'test', 'onValue');

    const result = await proxy('client', 'data', 'pattern');

    expect(isObservable(result)).toBe(false);
    expect(result).toEqual({ client: 'client', data: 'data' });
  });

  it('should run the hooks in registration order, before guards', async () => {
    const hook =
      (name: string) => (_ctx: unknown, next: () => Observable<unknown>) => {
        order.push(name);
        return next();
      };
    const creator = createContextCreator([hook('first'), hook('second')]);
    const proxy = creator.create(instance, instance.onValue, 'test', 'onValue');

    const result = await proxy('client', 'data', 'pattern');

    await expect(
      firstValueFrom(result as Observable<unknown>),
    ).resolves.toEqual({ client: 'client', data: 'data' });
    expect(order).toEqual(['first', 'second', 'guard']);
  });

  it('should hand a "ws" execution context to the hooks', async () => {
    let context: ExecutionContextHost | undefined;
    const creator = createContextCreator([
      (ctx: ExecutionContextHost, next: () => Observable<unknown>) => {
        context = ctx;
        return next();
      },
    ]);
    const proxy = creator.create(instance, instance.onValue, 'test', 'onValue');

    await firstValueFrom(
      (await proxy('client', 'data', 'pattern')) as Observable<unknown>,
    );

    expect(context!.getType()).toBe('ws');
    expect(context!.getClass()).toBe(HookGateway);
    expect(context!.getHandler()).toBe(instance.onValue);
    expect(context!.switchToWs().getClient()).toBe('client');
    expect(context!.switchToWs().getData()).toBe('data');
    expect(context!.switchToWs().getPattern()).toBe('pattern');
  });

  it('should skip guards and the handler when a hook does not call next()', async () => {
    const handlerSpy = vi.spyOn(instance, 'onValue');
    const creator = createContextCreator([() => of('short-circuited')]);
    const proxy = creator.create(instance, instance.onValue, 'test', 'onValue');

    const result = await proxy('client', 'data', 'pattern');

    await expect(firstValueFrom(result as Observable<unknown>)).resolves.toBe(
      'short-circuited',
    );
    expect(order).toEqual([]);
    expect(handlerSpy).not.toHaveBeenCalled();
  });

  it('should flatten an observable returned by the handler', async () => {
    const creator = createContextCreator([
      (_ctx: unknown, next: () => Observable<unknown>) => next(),
    ]);
    const proxy = creator.create(
      instance,
      instance.onObservable,
      'test',
      'onObservable',
    );

    const result = await proxy('client', 'data', 'pattern');

    await expect(
      lastValueFrom((result as Observable<unknown>).pipe(toArray())),
    ).resolves.toEqual([1, 2]);
  });

  it('should reject when a hook throws synchronously', async () => {
    const error = new Error('hook failed');
    const creator = createContextCreator([
      () => {
        throw error;
      },
    ]);
    const proxy = creator.create(instance, instance.onValue, 'test', 'onValue');

    await expect(proxy('client', 'data', 'pattern')).rejects.toBe(error);
  });

  it('should surface a forbidden guard after the hooks have run', async () => {
    const creator = createContextCreator([
      (_ctx: unknown, next: () => Observable<unknown>) => {
        order.push('hook');
        return next();
      },
    ]);
    vi.spyOn(guardsContextCreator, 'create').mockReturnValue([
      { canActivate: () => false },
    ] as any);
    const proxy = creator.create(instance, instance.onValue, 'test', 'onValue');

    const result = await proxy('client', 'data', 'pattern');

    await expect(
      firstValueFrom(result as Observable<unknown>),
    ).rejects.toBeInstanceOf(WsException);
    expect(order).toEqual(['hook']);
  });

  it('should run every hook again when an earlier one calls next() twice', async () => {
    const creator = createContextCreator([
      (_ctx: unknown, next: () => Observable<unknown>) =>
        next().pipe(switchMap(() => next())),
      (_ctx: unknown, next: () => Observable<unknown>) => {
        order.push('second');
        return next();
      },
    ]);
    const proxy = creator.create(instance, instance.onValue, 'test', 'onValue');

    await lastValueFrom(
      (await proxy('client', 'data', 'pattern')) as Observable<unknown>,
    );

    expect(order).toEqual(['second', 'guard', 'second', 'guard']);
  });

  it('should reject a hook that does not return an observable', async () => {
    const creator = createContextCreator([
      (_ctx: unknown, next: () => Observable<unknown>) => {
        next();
      },
    ]);
    const proxy = creator.create(instance, instance.onValue, 'test', 'onValue');

    await expect(proxy('client', 'data', 'pattern')).rejects.toThrow(
      /hook at index 0 must return an Observable/,
    );
    expect(order).toEqual([]);
  });

  it('should reject an async hook placed after another hook', async () => {
    const creator = createContextCreator([
      (_ctx: unknown, next: () => Observable<unknown>) => next(),
      async (_ctx: unknown, next: () => Observable<unknown>) => next(),
    ]);
    const proxy = creator.create(instance, instance.onValue, 'test', 'onValue');

    await expect(proxy('client', 'data', 'pattern')).rejects.toThrow(
      /hook at index 1 must return an Observable/,
    );
  });

  it('should take the no-hook path with an older @nestjs/core', async () => {
    // An older "ApplicationConfig" has no gateway hooks
    const creator = new WsContextCreator(
      Object.assign(new WsProxy(), { create: (callback: any) => callback }),
      new ExceptionFiltersContext(new NestContainer()),
      new PipesContextCreator(new NestContainer()) as any,
      new PipesConsumer() as any,
      new GuardsContextCreator(new NestContainer()) as any,
      new GuardsConsumer() as any,
      new InterceptorsContextCreator(new NestContainer()) as any,
      new InterceptorsConsumer() as any,
      {} as ApplicationConfig,
    );
    const proxy = creator.create(instance, instance.onValue, 'test', 'onValue');

    await expect(proxy('client', 'data', 'pattern')).resolves.toEqual({
      client: 'client',
      data: 'data',
    });
  });

  describe('when wrapped by WsProxy', () => {
    it('should pass a synchronous hook error to the exceptions handler', async () => {
      const handleSpy = vi
        .spyOn(WsExceptionsHandler.prototype, 'handle')
        .mockImplementation(() => {});
      const error = new Error('hook failed');
      const creator = createContextCreator(
        [
          () => {
            throw error;
          },
        ],
        new WsProxy(),
      );
      const proxy = creator.create(
        instance,
        instance.onValue,
        'test',
        'onValue',
      );

      await proxy('client', 'data');

      expect(handleSpy).toHaveBeenCalledWith(error, expect.anything());
    });

    it('should pass an observable hook error to the exceptions handler', async () => {
      const handleSpy = vi
        .spyOn(WsExceptionsHandler.prototype, 'handle')
        .mockImplementation(() => {});
      const error = new Error('hook failed');
      const creator = createContextCreator(
        [() => throwError(() => error)],
        new WsProxy(),
      );
      const proxy = creator.create(
        instance,
        instance.onValue,
        'test',
        'onValue',
      );

      const result = await proxy('client', 'data');

      await expect(
        lastValueFrom((result as Observable<unknown>).pipe(toArray())),
      ).resolves.toEqual([]);
      expect(handleSpy).toHaveBeenCalledWith(error, expect.anything());
    });
  });
});
