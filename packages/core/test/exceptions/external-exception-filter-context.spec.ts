import { FILTER_CATCH_EXCEPTIONS } from '../../../common/constants.js';
import { Catch } from '../../../common/decorators/core/catch.decorator.js';
import { UseFilters } from '../../../common/decorators/core/exception-filters.decorator.js';
import { Scope } from '../../../common/interfaces/scope-options.interface.js';
import { ApplicationConfig } from '../../application-config.js';
import { ExternalExceptionFilterContext } from '../../exceptions/external-exception-filter-context.js';
import { NestContainer } from '../../injector/container.js';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';

describe('ExternalExceptionFilterContext', () => {
  let applicationConfig: ApplicationConfig;
  let exceptionFilter: ExternalExceptionFilterContext;

  class CustomException {}
  @Catch(CustomException)
  class ExceptionFilter implements ExceptionFilter {
    public catch(exc, res) {}
  }
  class ClassWithNoMetadata implements ExceptionFilter {
    public catch(exc, res) {}
  }

  beforeEach(() => {
    applicationConfig = new ApplicationConfig();
    exceptionFilter = new ExternalExceptionFilterContext(
      new NestContainer(),
      applicationConfig,
    );
  });
  describe('create', () => {
    describe('when filters metadata is empty', () => {
      class EmptyMetadata {}
      beforeEach(() => {
        vi.spyOn(exceptionFilter, 'createContext').mockReturnValue([]);
      });
      it('should return plain ExceptionHandler object', () => {
        const filter = exceptionFilter.create(
          new EmptyMetadata(),
          () => ({}) as any,
          undefined!,
        );
        expect((filter as any).filters).toHaveLength(0);
      });
    });
    describe('when filters metadata is not empty', () => {
      @UseFilters(new ExceptionFilter())
      class WithMetadata {}

      it('should return ExceptionHandler object with exception filters', () => {
        const filter = exceptionFilter.create(
          new WithMetadata(),
          () => ({}) as any,
          undefined!,
        );
        expect((filter as any).filters).not.toHaveLength(0);
      });
    });
  });
  describe('reflectCatchExceptions', () => {
    it('should return FILTER_CATCH_EXCEPTIONS metadata', () => {
      expect(
        exceptionFilter.reflectCatchExceptions(new ExceptionFilter()),
      ).toEqual([CustomException]);
    });
    it('should return an empty array when metadata was found', () => {
      expect(
        exceptionFilter.reflectCatchExceptions(new ClassWithNoMetadata()),
      ).toEqual([]);
    });
    it('should return the metadata of the parent of an undecorated filter', () => {
      class Inherited extends ExceptionFilter {}
      @Catch()
      class CatchEverything extends ExceptionFilter {}

      expect(exceptionFilter.reflectCatchExceptions(new Inherited())).toEqual([
        CustomException,
      ]);
      expect(
        exceptionFilter.reflectCatchExceptions(new CatchEverything()),
      ).toEqual([]);
    });
    describe('when a mixin helper overwrote the "constructor" of the filter prototype', () => {
      class OtherException {}
      @Catch(OtherException)
      class Mixin {}
      class MixinWithNoMetadata {}

      it('should return the metadata of the filter class', () => {
        @Catch(CustomException)
        class MixedIn implements ExceptionFilter {
          public catch(exc, res) {}
        }
        // What mixin helpers copying every property of the prototype do
        MixedIn.prototype.constructor = MixinWithNoMetadata;
        expect(exceptionFilter.reflectCatchExceptions(new MixedIn())).toEqual([
          CustomException,
        ]);

        MixedIn.prototype.constructor = Mixin;
        expect(exceptionFilter.reflectCatchExceptions(new MixedIn())).toEqual([
          CustomException,
        ]);
      });
      it('should return the metadata defined on the registered class only', () => {
        class MixedIn implements ExceptionFilter {
          public catch(exc, res) {}
        }
        // What an older "@Catch()" stores
        Reflect.defineMetadata(
          FILTER_CATCH_EXCEPTIONS,
          [CustomException],
          MixedIn,
        );
        MixedIn.prototype.constructor = Mixin;
        new InstanceWrapper({ metatype: MixedIn });

        expect(exceptionFilter.reflectCatchExceptions(new MixedIn())).toEqual([
          CustomException,
        ]);
      });
    });
    describe('when a class decorator below "@Catch()" returned a Proxy', () => {
      it('should return the metadata of the filter class', () => {
        const Proxied = (target: any) => new Proxy(target, {});

        @Catch(CustomException)
        @Proxied
        class ProxiedFilter implements ExceptionFilter {
          public catch(exc, res) {}
        }
        expect(
          exceptionFilter.reflectCatchExceptions(new ProxiedFilter()),
        ).toEqual([CustomException]);
      });
    });
  });
  describe('createConcreteContext', () => {
    class InvalidFilter {}
    const filters = [new ExceptionFilter(), new InvalidFilter(), 'test'];

    it('should return expected exception filters metadata', () => {
      const resolved = exceptionFilter.createConcreteContext(filters as any);
      expect(resolved).toHaveLength(1);
      expect(resolved[0].exceptionMetatypes).toEqual([CustomException]);
      expect(resolved[0].func).toBeTypeOf('function');
    });

    it('should keep classes without a name', () => {
      const AnonymousFilter = (() => class {})();
      const wrapper = {
        instance: new ClassWithNoMetadata(),
        isConstructorCalled: true,
        getInstanceByContextId: () => wrapper,
      };
      const container = new NestContainer();
      vi.spyOn(container.getModules(), 'get').mockReturnValue({
        injectables: new Map([[AnonymousFilter, wrapper]]),
      } as any);
      const filterContext = new ExternalExceptionFilterContext(
        container,
        applicationConfig,
      );
      filterContext['moduleContext'] = 'test';

      expect(AnonymousFilter.name).toBe('');
      const resolved = filterContext.createConcreteContext([
        AnonymousFilter,
      ] as any);
      expect(resolved).toHaveLength(1);
      expect(resolved[0].func).toBeTypeOf('function');
    });
  });

  describe('getGlobalMetadata', () => {
    describe('when contextId is static and inquirerId is nil', () => {
      it('should return global filters', () => {
        const expectedResult = applicationConfig.getGlobalFilters();
        expect(exceptionFilter.getGlobalMetadata()).toBe(expectedResult);
      });
    });
    describe('otherwise', () => {
      it('should merge static global with request/transient scoped filters', () => {
        const globalFilters: any = ['test'];
        const instanceWrapper = new InstanceWrapper();
        const instance = 'request-scoped';
        const scopedFilterWrappers = [instanceWrapper];

        vi.spyOn(applicationConfig, 'getGlobalFilters').mockImplementation(
          () => globalFilters,
        );
        vi.spyOn(
          applicationConfig,
          'getGlobalRequestFilters',
        ).mockImplementation(() => scopedFilterWrappers);
        vi.spyOn(instanceWrapper, 'getInstanceByContextId').mockImplementation(
          () => ({ instance }) as any,
        );

        const result = exceptionFilter.getGlobalMetadata({ id: 3 });
        expect(result).toContain(instance);
        globalFilters.forEach(f => expect(result).toContain(f));
      });
    });
    describe('when a ContextIdStrategy is applied', () => {
      it('should look up durable filters with the durable context id', () => {
        const tenantContextId = { id: 2 };
        const contextId = {
          id: 3,
          getParent: info => (info.isTreeDurable ? tenantContextId : contextId),
        };
        const durableWrapper = new InstanceWrapper({
          scope: Scope.REQUEST,
          durable: true,
        });
        const requestWrapper = new InstanceWrapper({ scope: Scope.REQUEST });
        durableWrapper.setInstanceByContextId(tenantContextId, {
          instance: 'durable',
        });
        requestWrapper.setInstanceByContextId(contextId, {
          instance: 'request-scoped',
        });

        vi.spyOn(
          applicationConfig,
          'getGlobalRequestFilters',
        ).mockImplementation(() => [durableWrapper, requestWrapper]);

        expect(exceptionFilter.getGlobalMetadata(contextId)).toEqual([
          'durable',
          'request-scoped',
        ]);
      });
    });
  });
});
