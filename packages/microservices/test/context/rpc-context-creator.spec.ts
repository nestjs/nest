import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { of } from 'rxjs';
import { Injectable, UseGuards, UsePipes } from '../../../common/index.js';
import { CUSTOM_ROUTE_ARGS_METADATA } from '../../../common/constants.js';
import { ApplicationConfig } from '../../../core/application-config.js';
import { GuardsConsumer } from '../../../core/guards/guards-consumer.js';
import { GuardsContextCreator } from '../../../core/guards/guards-context-creator.js';
import { NestContainer } from '../../../core/injector/container.js';
import { InterceptorsConsumer } from '../../../core/interceptors/interceptors-consumer.js';
import { InterceptorsContextCreator } from '../../../core/interceptors/interceptors-context-creator.js';
import { PipesConsumer } from '../../../core/pipes/pipes-consumer.js';
import { PipesContextCreator } from '../../../core/pipes/pipes-context-creator.js';
import { ExceptionFiltersContext } from '../../context/exception-filters-context.js';
import { RpcContextCreator } from '../../context/rpc-context-creator.js';
import { RpcProxy } from '../../context/rpc-proxy.js';
import { RpcParamtype } from '../../enums/rpc-paramtype.enum.js';
import { RpcParamsFactory } from '../../factories/rpc-params-factory.js';
import { RpcException } from '../../index.js';

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
});
