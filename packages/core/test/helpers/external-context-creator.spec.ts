import { ForbiddenException, SetMetadata } from '@nestjs/common';
import {
  CUSTOM_ROUTE_ARGS_METADATA,
  ENTRY_PROVIDER_WATERMARK,
} from '@nestjs/common/constants.js';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum.js';
import { of } from 'rxjs';
import { ExternalExceptionFilterContext } from '../../exceptions/external-exception-filter-context.js';
import { GuardsConsumer } from '../../guards/guards-consumer.js';
import { GuardsContextCreator } from '../../guards/guards-context-creator.js';
import { ExternalContextCreator } from '../../helpers/external-context-creator.js';
import { STATIC_CONTEXT } from '../../injector/constants.js';
import { NestContainer } from '../../injector/container.js';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';
import { Module } from '../../injector/module.js';
import { ModulesContainer } from '../../injector/modules-container.js';
import { InterceptorsConsumer } from '../../interceptors/interceptors-consumer.js';
import { InterceptorsContextCreator } from '../../interceptors/interceptors-context-creator.js';
import { PipesConsumer } from '../../pipes/pipes-consumer.js';
import { PipesContextCreator } from '../../pipes/pipes-context-creator.js';
import { RouteParamsFactory } from '../../router/route-params-factory.js';

describe('ExternalContextCreator', () => {
  let contextCreator: ExternalContextCreator;
  let callback: any;
  let bindSpy: ReturnType<typeof vi.fn>;
  let applySpy: ReturnType<typeof vi.fn>;
  let guardsConsumer: GuardsConsumer;
  let pipesConsumer: PipesConsumer;
  let guardsContextCreator: GuardsContextCreator;

  beforeEach(() => {
    callback = {
      bind: () => ({}),
      apply: () => ({}),
    };
    bindSpy = vi.spyOn(callback, 'bind');
    applySpy = vi.spyOn(callback, 'apply');

    guardsConsumer = new GuardsConsumer();
    pipesConsumer = new PipesConsumer();
    guardsContextCreator = new GuardsContextCreator(new NestContainer());
    vi.spyOn(guardsContextCreator, 'create').mockReturnValue([{}] as any);
    contextCreator = new ExternalContextCreator(
      guardsContextCreator,
      guardsConsumer,
      new InterceptorsContextCreator(new NestContainer()),
      new InterceptorsConsumer(),
      new ModulesContainer(),
      new PipesContextCreator(new NestContainer()),
      pipesConsumer,
      new ExternalExceptionFilterContext(new NestContainer()),
    );
  });
  describe('create', () => {
    it('should call "getContextModuleName" with expected argument', () =>
      new Promise<void>(done => {
        const getContextModuleKeySpy = vi.spyOn(
          contextCreator,
          'getContextModuleKey',
        );
        contextCreator.create({ foo: 'bar' }, callback, '', '', null!);
        expect(getContextModuleKeySpy).toHaveBeenCalled();
        done();
      }));
    describe('when the "constructor" of the host prototype was overwritten', () => {
      it('should look the module up by the registered class', () => {
        class Mixin {}
        class Host {}
        Host.prototype.constructor = Mixin;
        new InstanceWrapper({ metatype: Host });

        const getContextModuleKeySpy = vi.spyOn(
          contextCreator,
          'getContextModuleKey',
        );
        contextCreator.create(new Host(), callback, '', '', null!);
        expect(getContextModuleKeySpy).toHaveBeenCalledWith(Host);
      });
    });
    describe('when no inquirer id is given', () => {
      @SetMetadata(ENTRY_PROVIDER_WATERMARK, true)
      class EntryProvider {}

      class PlainProvider {}

      let moduleRef: Module;

      beforeEach(() => {
        const modules = new ModulesContainer();
        moduleRef = new Module(class {}, new NestContainer());
        moduleRef.addProvider(EntryProvider);
        moduleRef.addProvider(PlainProvider);
        modules.set('key', moduleRef);
        (contextCreator as any).modulesContainer = modules;
      });

      it('should look up the enhancers of an entry provider with that provider as the inquirer', () => {
        const instance = new EntryProvider();
        contextCreator.create(instance, callback, '', '', null!);

        expect(guardsContextCreator.create).toHaveBeenCalledWith(
          instance,
          callback,
          'key',
          STATIC_CONTEXT,
          moduleRef.providers.get(EntryProvider)!.id,
        );
      });

      it('should not use any other provider as the inquirer', () => {
        const instance = new PlainProvider();
        contextCreator.create(instance, callback, '', '', null!);

        expect(guardsContextCreator.create).toHaveBeenCalledWith(
          instance,
          callback,
          'key',
          STATIC_CONTEXT,
          undefined,
        );
      });
    });
    describe('when the host is registered under a token other than its class', () => {
      @SetMetadata(ENTRY_PROVIDER_WATERMARK, true)
      class Resolver {}

      let wrapper: InstanceWrapper;

      beforeEach(() => {
        const modules = new ModulesContainer();
        const moduleRef = new Module(class {}, new NestContainer());
        moduleRef.addProvider({ provide: 'RESOLVER', useClass: Resolver });
        wrapper = moduleRef.providers.get('RESOLVER')!;
        wrapper.instance = new Resolver();
        modules.set('key', moduleRef);
        (contextCreator as any).modulesContainer = modules;
      });

      it('should find its module and inquirer by its instance', () => {
        contextCreator.create(wrapper.instance, callback, '', '', null!);

        expect(guardsContextCreator.create).toHaveBeenCalledWith(
          wrapper.instance,
          callback,
          'key',
          STATIC_CONTEXT,
          wrapper.id,
        );
      });

      it('should find its module by the inquirer id', () => {
        const instance = new Resolver();
        const contextId = { id: 2 };
        contextCreator.create(
          instance,
          callback,
          '',
          '',
          null!,
          contextId,
          wrapper.id,
        );

        expect(guardsContextCreator.create).toHaveBeenCalledWith(
          instance,
          callback,
          'key',
          contextId,
          wrapper.id,
        );
      });
    });
    describe('returns proxy function', () => {
      let proxyContext;
      let instance;

      beforeEach(() => {
        instance = { foo: 'bar' };
        proxyContext = contextCreator.create(instance, callback, '', '', null!);
      });
      it('should be a function', () => {
        expect(proxyContext).toBeTypeOf('function');
      });
      describe('when proxy function called', () => {
        describe('when can not activate', () => {
          it('should throw exception when "tryActivate" returns false', async () => {
            vi.spyOn(guardsConsumer, 'tryActivate').mockImplementation(
              async () => false,
            );
            let err: any;
            try {
              await proxyContext(1, 2, 3);
            } catch (e) {
              err = e;
            }
            expect(err).toBeInstanceOf(ForbiddenException);
          });
        });
        describe('when can activate', () => {
          it('should apply context and args', async () => {
            const args = [1, 2, 3];
            vi.spyOn(guardsConsumer, 'tryActivate').mockImplementation(
              async () => true,
            );

            await proxyContext(...args);
            expect(applySpy).toHaveBeenCalled();
          });
        });
      });
    });
  });
  describe('getContextModuleKey', () => {
    describe('when constructor is undefined', () => {
      it('should return empty string', () => {
        expect(contextCreator.getContextModuleKey(undefined)).toEqual('');
      });
    });
    describe('when module reference provider exists', () => {
      it('should return module key', () => {
        const modules = new Map();
        const moduleKey = 'key';

        const moduleRef = new Module(class {}, modules as any);
        modules.set(moduleKey, moduleRef);
        (contextCreator as any).modulesContainer = modules;

        vi.spyOn(moduleRef, 'hasProvider').mockImplementation(() => true);

        expect(
          contextCreator.getContextModuleKey({ randomObject: true } as any),
        ).toEqual(moduleKey);
      });
    });
    describe('when provider does not exists', () => {
      it('should return empty string', () => {
        expect(contextCreator.getContextModuleKey({} as any)).toEqual('');
      });
    });
  });
  describe('exchangeKeysForValues', () => {
    it('should exchange arguments keys for appropriate values', () => {
      const metadata = {
        [RouteParamtypes.REQUEST]: { index: 0, data: 'test', pipes: [] },
        [RouteParamtypes.BODY]: { index: 2, data: 'test', pipes: [] },
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
        new RouteParamsFactory(),
      );
      const expectedValues = [
        { index: 0, type: RouteParamtypes.REQUEST, data: 'test' },
        { index: 2, type: RouteParamtypes.BODY, data: 'test' },
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
        { metatype, type: RouteParamtypes.NEXT, data: null },
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

  describe('transformToResult', () => {
    describe('when resultOrDeferred', () => {
      describe('is Promise', () => {
        it('should return Promise', async () => {
          const value = 100;
          expect(
            await contextCreator.transformToResult(Promise.resolve(value)),
          ).toBe(100);
        });
      });

      describe('is Observable', () => {
        it('should return Promise', async () => {
          const value = 100;
          expect(await contextCreator.transformToResult(of(value))).toBe(100);
        });
      });

      describe('is value', () => {
        it('should return Promise', async () => {
          const value = 100;
          expect(await contextCreator.transformToResult(value)).toBe(100);
        });
      });
    });
  });
});
