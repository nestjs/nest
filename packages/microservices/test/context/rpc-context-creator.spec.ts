import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { Observable, of } from 'rxjs';
import { Injectable, UseGuards, UsePipes } from '../../../common';
import { CUSTOM_ROUTE_ARGS_METADATA } from '../../../common/constants';
import { ApplicationConfig } from '../../../core/application-config';
import { GuardsConsumer } from '../../../core/guards/guards-consumer';
import { GuardsContextCreator } from '../../../core/guards/guards-context-creator';
import { NestContainer } from '../../../core/injector/container';
import { InterceptorsConsumer } from '../../../core/interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '../../../core/interceptors/interceptors-context-creator';
import { PipesConsumer } from '../../../core/pipes/pipes-consumer';
import { PipesContextCreator } from '../../../core/pipes/pipes-context-creator';
import { ExceptionFiltersContext } from '../../context/exception-filters-context';
import { RpcContextCreator } from '../../context/rpc-context-creator';
import { RpcProxy } from '../../context/rpc-proxy';
import { RpcParamtype } from '../../enums/rpc-paramtype.enum';
import { RpcParamsFactory } from '../../factories/rpc-params-factory';
import { RpcException } from '../../index';

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

describe('RpcContextCreator', () => {
  let contextCreator: RpcContextCreator;
  let rpcProxy: RpcProxy;
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
    test(data: string) {
      return of(false);
    }
  }

  beforeEach(() => {
    const container: any = new NestContainer();
    rpcProxy = new RpcProxy();
    exceptionFiltersContext = new ExceptionFiltersContext(
      container,
      new ApplicationConfig() as any,
    );
    vi.spyOn(rpcProxy, 'create').mockImplementation(a => a);

    pipesCreator = new PipesContextCreator(container);
    pipesConsumer = new PipesConsumer();
    guardsContextCreator = new GuardsContextCreator(container);
    guardsConsumer = new GuardsConsumer();
    contextCreator = new RpcContextCreator(
      rpcProxy,
      exceptionFiltersContext,
      pipesCreator as any,
      pipesConsumer as any,
      guardsContextCreator as any,
      guardsConsumer as any,
      new InterceptorsContextCreator(container) as any,
      new InterceptorsConsumer() as any,
    );

    instance = new Test();
    module = 'test';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should create exception handler', () => {
      const handlerCreateSpy = vi.spyOn(exceptionFiltersContext, 'create');
      contextCreator.create(instance, instance.test, module, 'test');
      expect(handlerCreateSpy).toHaveBeenCalledWith(
        instance,
        instance.test as any,
        module,
        expect.anything(),
        undefined,
      );
    });
    it('should create pipes context', () => {
      const pipesCreateSpy = vi.spyOn(pipesCreator, 'create');
      contextCreator.create(instance, instance.test, module, 'test');
      expect(pipesCreateSpy).toHaveBeenCalledWith(
        instance,
        instance.test as any,
        module,
        expect.anything(),
        undefined,
      );
    });
    it('should create guards context', () => {
      const guardsCreateSpy = vi.spyOn(guardsContextCreator, 'create');
      contextCreator.create(instance, instance.test, module, 'test');
      expect(guardsCreateSpy).toHaveBeenCalledWith(
        instance,
        instance.test,
        module,
        expect.anything(),
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
        await proxy(data);

        expect(tryActivateSpy).toHaveBeenCalled();
      });
      describe('when can not activate', () => {
        it('should throw forbidden exception', async () => {
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
            expect(err).toBeInstanceOf(RpcException),
          );
        });
      });
    });
  });

  describe('reflectCallbackParamtypes', () => {
    it('should return paramtypes array', () => {
      const paramtypes = contextCreator.reflectCallbackParamtypes(
        instance,
        instance.test,
      );
      expect(paramtypes).toEqual([String]);
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
        [RpcParamtype.PAYLOAD]: { index: 0, data: 'test', pipes: [] },
        [RpcParamtype.CONTEXT]: { index: 2, data: 'test', pipes: [] },
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
        new RpcParamsFactory(),
        (args: unknown[]) => new ExecutionContextHost(args),
      );
      const expectedValues = [
        { index: 0, type: RpcParamtype.PAYLOAD, data: 'test' },
        { index: 2, type: RpcParamtype.CONTEXT, data: 'test' },
        { index: 3, type: `key${CUSTOM_ROUTE_ARGS_METADATA}`, data: 'custom' },
      ];
      expect(values[0]).toMatchObject(expectedValues[0]);
      expect(values[1]).toMatchObject(expectedValues[1]);
      expect(values[2]).toMatchObject(expectedValues[2]);
    });
  });
  describe('getParamValue', () => {
    let consumerApplySpy: any;
    const value = 3,
      metatype = null,
      transforms = [{ transform: vi.fn() }];

    beforeEach(() => {
      consumerApplySpy = vi.spyOn(pipesConsumer, 'apply');
    });
    it('should call "consumer.apply"', async () => {
      await contextCreator.getParamValue(
        value,
        { metatype, type: RpcParamtype.PAYLOAD, data: null },
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

  describe('preRequest hooks', () => {
    function makeCreatorWithHooks(hooks: any[]) {
      const container: any = new NestContainer();
      const localRpcProxy = new RpcProxy();
      const localExceptionFiltersContext = new ExceptionFiltersContext(
        container,
        new ApplicationConfig() as any,
      );
      vi.spyOn(localRpcProxy, 'create').mockImplementation(a => a);

      const mockConfig = {
        getGlobalPreRequestHooks: () => hooks,
      } as any;

      return new RpcContextCreator(
        localRpcProxy,
        localExceptionFiltersContext,
        new PipesContextCreator(container) as any,
        new PipesConsumer() as any,
        new GuardsContextCreator(container) as any,
        new GuardsConsumer() as any,
        new InterceptorsContextCreator(container) as any,
        new InterceptorsConsumer() as any,
        mockConfig,
      );
    }

    it('should execute preRequest hook before guards', async () => {
      const executionOrder: string[] = [];

      const hookFn = (_ctx: any, next: () => Observable<unknown>) => {
        executionOrder.push('hook');
        return next();
      };

      const creator = makeCreatorWithHooks([hookFn]);
      vi.spyOn(
        new GuardsContextCreator(new NestContainer() as any),
        'create',
      ).mockReturnValue([] as any);

      const localGuardsConsumer = new GuardsConsumer();
      vi.spyOn(localGuardsConsumer, 'tryActivate').mockImplementation(
        async () => {
          executionOrder.push('guard');
          return true;
        },
      );

      const container: any = new NestContainer();
      const localRpcProxy = new RpcProxy();
      const localExceptionFiltersContext = new ExceptionFiltersContext(
        container,
        new ApplicationConfig() as any,
      );
      vi.spyOn(localRpcProxy, 'create').mockImplementation(a => a);
      const mockConfig = { getGlobalPreRequestHooks: () => [hookFn] } as any;
      const localGuardsContextCreator = new GuardsContextCreator(container);
      vi.spyOn(localGuardsContextCreator, 'create').mockReturnValue([
        {
          canActivate: () => {
            executionOrder.push('guard');
            return true;
          },
        },
      ] as any);

      const hookCreator = new RpcContextCreator(
        localRpcProxy,
        localExceptionFiltersContext,
        new PipesContextCreator(container) as any,
        new PipesConsumer() as any,
        localGuardsContextCreator as any,
        new GuardsConsumer() as any,
        new InterceptorsContextCreator(container) as any,
        new InterceptorsConsumer() as any,
        mockConfig,
      );

      const proxy = hookCreator.create(instance, instance.test, module, 'test');
      const result = await proxy('data');
      if (result && typeof (result as any).subscribe === 'function') {
        await new Promise<void>(resolve => {
          (result as Observable<unknown>).subscribe({
            complete: resolve,
            error: resolve,
          });
        });
      }

      expect(executionOrder[0]).toBe('hook');
      expect(executionOrder[1]).toBe('guard');
    });

    it('should chain multiple hooks in registration order', async () => {
      const order: string[] = [];

      const hook1 = (_ctx: any, next: () => Observable<unknown>) => {
        order.push('hook1');
        return next();
      };
      const hook2 = (_ctx: any, next: () => Observable<unknown>) => {
        order.push('hook2');
        return next();
      };

      const container: any = new NestContainer();
      const localRpcProxy = new RpcProxy();
      vi.spyOn(localRpcProxy, 'create').mockImplementation(a => a);
      const mockConfig = {
        getGlobalPreRequestHooks: () => [hook1, hook2],
      } as any;
      const localGuardsContextCreator = new GuardsContextCreator(container);
      vi.spyOn(localGuardsContextCreator, 'create').mockReturnValue([
        {
          canActivate: () => {
            order.push('guard');
            return true;
          },
        },
      ] as any);

      const hookCreator = new RpcContextCreator(
        localRpcProxy,
        new ExceptionFiltersContext(container, new ApplicationConfig() as any),
        new PipesContextCreator(container) as any,
        new PipesConsumer() as any,
        localGuardsContextCreator as any,
        new GuardsConsumer() as any,
        new InterceptorsContextCreator(container) as any,
        new InterceptorsConsumer() as any,
        mockConfig,
      );

      const proxy = hookCreator.create(instance, instance.test, module, 'test');
      const result = await proxy('data');
      if (result && typeof (result as any).subscribe === 'function') {
        await new Promise<void>(resolve => {
          (result as Observable<unknown>).subscribe({
            complete: resolve,
            error: resolve,
          });
        });
      }

      expect(order).toEqual(['hook1', 'hook2', 'guard']);
    });

    it('should not call hook when no hooks are registered (fast-path)', async () => {
      const hookFn = vi.fn((_ctx: any, next: () => Observable<unknown>) =>
        next(),
      );
      const creator = makeCreatorWithHooks([]);

      const guardSpy = vi.spyOn(guardsConsumer, 'tryActivate');
      vi.spyOn(guardsContextCreator, 'create').mockImplementation(
        () => [{ canActivate: () => true }] as any,
      );

      contextCreator = new RpcContextCreator(
        rpcProxy,
        exceptionFiltersContext,
        pipesCreator as any,
        pipesConsumer as any,
        guardsContextCreator as any,
        guardsConsumer as any,
        new InterceptorsContextCreator(new NestContainer() as any) as any,
        new InterceptorsConsumer() as any,
        { getGlobalPreRequestHooks: () => [] } as any,
      );

      const proxy = contextCreator.create(
        instance,
        instance.test,
        module,
        'test',
      );
      await proxy('data');
      expect(hookFn).not.toHaveBeenCalled();
      expect(guardSpy).toHaveBeenCalled();
    });

    it('should provide ExecutionContext with getClass() and getHandler() to the hook', async () => {
      let capturedContext: any;

      const hookFn = (ctx: any, next: () => Observable<unknown>) => {
        capturedContext = ctx;
        return next();
      };

      const container: any = new NestContainer();
      const localRpcProxy = new RpcProxy();
      vi.spyOn(localRpcProxy, 'create').mockImplementation(a => a);
      const mockConfig = { getGlobalPreRequestHooks: () => [hookFn] } as any;
      const localGuardsContextCreator = new GuardsContextCreator(container);
      vi.spyOn(localGuardsContextCreator, 'create').mockReturnValue([] as any);

      const hookCreator = new RpcContextCreator(
        localRpcProxy,
        new ExceptionFiltersContext(container, new ApplicationConfig() as any),
        new PipesContextCreator(container) as any,
        new PipesConsumer() as any,
        localGuardsContextCreator as any,
        new GuardsConsumer() as any,
        new InterceptorsContextCreator(container) as any,
        new InterceptorsConsumer() as any,
        mockConfig,
      );

      const proxy = hookCreator.create(instance, instance.test, module, 'test');
      const result = await proxy('data');
      if (result && typeof (result as any).subscribe === 'function') {
        await new Promise<void>(resolve => {
          (result as Observable<unknown>).subscribe({
            complete: resolve,
            error: resolve,
          });
        });
      }

      expect(capturedContext).not.toBeUndefined();
      expect(capturedContext.getClass()).toBe(Test);
      expect(capturedContext.getHandler()).toBe(instance.test);
      expect(capturedContext.getType()).toBe('rpc');
    });

    it('should simulate ALS context available in guard (AsyncLocalStorage scenario)', async () => {
      const store = new Map<string, string>();
      let correlationIdInGuard: string | undefined;

      const hookFn = (_ctx: any, next: () => Observable<unknown>) => {
        store.set('correlationId', 'test-id-123');
        return next();
      };

      const container: any = new NestContainer();
      const localRpcProxy = new RpcProxy();
      vi.spyOn(localRpcProxy, 'create').mockImplementation(a => a);
      const mockConfig = { getGlobalPreRequestHooks: () => [hookFn] } as any;
      const localGuardsContextCreator = new GuardsContextCreator(container);
      vi.spyOn(localGuardsContextCreator, 'create').mockReturnValue([
        {
          canActivate: () => {
            correlationIdInGuard = store.get('correlationId');
            return true;
          },
        },
      ] as any);

      const hookCreator = new RpcContextCreator(
        localRpcProxy,
        new ExceptionFiltersContext(container, new ApplicationConfig() as any),
        new PipesContextCreator(container) as any,
        new PipesConsumer() as any,
        localGuardsContextCreator as any,
        new GuardsConsumer() as any,
        new InterceptorsContextCreator(container) as any,
        new InterceptorsConsumer() as any,
        mockConfig,
      );

      const proxy = hookCreator.create(instance, instance.test, module, 'test');
      const result = await proxy('data');
      if (result && typeof (result as any).subscribe === 'function') {
        await new Promise<void>(resolve => {
          (result as Observable<unknown>).subscribe({
            complete: resolve,
            error: resolve,
          });
        });
      }

      expect(correlationIdInGuard).toBe('test-id-123');
    });
  });
});
