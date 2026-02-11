import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { of } from 'rxjs';
import { Injectable, UseGuards, UsePipes } from '../../../common/index.js';
import { CUSTOM_ROUTE_ARGS_METADATA } from '../../../common/constants.js';
import { GuardsConsumer } from '../../../core/guards/guards-consumer.js';
import { GuardsContextCreator } from '../../../core/guards/guards-context-creator.js';
import { NestContainer } from '../../../core/injector/container.js';
import { InterceptorsConsumer } from '../../../core/interceptors/interceptors-consumer.js';
import { InterceptorsContextCreator } from '../../../core/interceptors/interceptors-context-creator.js';
import { PipesConsumer } from '../../../core/pipes/pipes-consumer.js';
import { PipesContextCreator } from '../../../core/pipes/pipes-context-creator.js';
import { ExceptionFiltersContext } from '../../context/exception-filters-context.js';
import { WsContextCreator } from '../../context/ws-context-creator.js';
import { WsProxy } from '../../context/ws-proxy.js';
import { WsParamtype } from '../../enums/ws-paramtype.enum.js';
import { WsParamsFactory } from '../../factories/ws-params-factory.js';
import { WsException } from '../../index.js';

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
      );
    });
    it('should create pipes context', () => {
      const pipesCreateSpy = vi.spyOn(pipesCreator, 'create');
      contextCreator.create(instance, instance.test, module, 'create');
      expect(pipesCreateSpy).toHaveBeenCalledWith(
        instance,
        instance.test,
        module,
      );
    });
    it('should create guards context', () => {
      const guardsCreateSpy = vi.spyOn(guardsContextCreator, 'create');
      contextCreator.create(instance, instance.test, module, 'create');
      expect(guardsCreateSpy).toHaveBeenCalledWith(
        instance,
        instance.test,
        module,
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
