import { Catch } from '../../../common/decorators/core/catch.decorator.js';
import { UseFilters } from '../../../common/decorators/core/exception-filters.decorator.js';
import { Scope } from '../../../common/interfaces/scope-options.interface.js';
import { ApplicationConfig } from '../../application-config.js';
import { ExternalExceptionFilterContext } from '../../exceptions/external-exception-filter-context.js';
import { ExecutionContextHost } from '../../helpers/execution-context-host.js';
import { NestContainer } from '../../injector/container.js';
import { Injector } from '../../injector/injector.js';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';
import { Module } from '../../injector/module.js';
import { REQUEST_CONTEXT_ID } from '../../router/request/request-constants.js';

describe('ExternalExceptionFilterContext', () => {
  let applicationConfig: ApplicationConfig;
  let container: NestContainer;
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
    container = new NestContainer();
    exceptionFilter = new ExternalExceptionFilterContext(
      container,
      applicationConfig,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    describe('when a scoped global filter has to be built for the call', () => {
      @Catch()
      class CatchAllFilter {
        public catch(exc, res) {}
      }
      const exception = new CustomException() as Error;
      const callback = () => ({}) as any;
      let wrapper: InstanceWrapper;
      let scopedFilter: ExceptionFilter;
      let sharedFilter: CatchAllFilter;
      let req: object;
      let host: ExecutionContextHost;

      beforeEach(() => {
        wrapper = new InstanceWrapper({
          scope: Scope.REQUEST,
          host: new Module(class HostModule {}, container),
        });
        scopedFilter = new ExceptionFilter();
        sharedFilter = new CatchAllFilter();
        req = {};
        host = new ExecutionContextHost([req, {}]);

        applicationConfig.addGlobalRequestFilter(wrapper);
        applicationConfig.addGlobalFilter(sharedFilter);
        // `undefined` means "not handled", which would rethrow the exception
        vi.spyOn(scopedFilter, 'catch').mockReturnValue('scoped');
        vi.spyOn(sharedFilter, 'catch').mockReturnValue('shared');
        vi.spyOn(container, 'registerRequestProvider').mockImplementation(
          () => {},
        );
        vi.spyOn(Injector.prototype, 'loadInjectable').mockImplementation(
          async (item, _, contextId, inquirer) =>
            item.setInstanceByContextId(
              contextId!,
              { instance: scopedFilter, isResolved: true },
              inquirer!.id,
            ),
        );
      });

      it('should build it for the request of the call', async () => {
        const handler = exceptionFilter.create({}, callback, undefined!);
        expect(Injector.prototype.loadInjectable).not.toHaveBeenCalled();

        await handler.next(exception, host);

        const contextId = req[REQUEST_CONTEXT_ID];
        expect(contextId).toBeDefined();
        expect(container.registerRequestProvider).toHaveBeenCalledWith(
          req,
          contextId,
        );
        expect(Injector.prototype.loadInjectable).toHaveBeenCalledWith(
          wrapper,
          wrapper.host,
          contextId,
          wrapper,
        );
        expect(scopedFilter.catch).toHaveBeenCalledWith(exception, host);
        expect(sharedFilter.catch).not.toHaveBeenCalled();
      });

      it('should build it under the host the handler was created for', async () => {
        const inquirer = new InstanceWrapper();
        const moduleRef = new Module(class EntryModule {}, container);
        vi.spyOn(moduleRef, 'getProviderById').mockReturnValue(inquirer);
        vi.spyOn(container, 'getModules').mockReturnValue(
          new Map([['moduleKey', moduleRef]]) as ReturnType<
            NestContainer['getModules']
          >,
        );
        const contextId = { id: 1 };

        await exceptionFilter
          .create({}, callback, 'moduleKey', contextId, inquirer.id)
          .next(exception, host);

        expect(Injector.prototype.loadInjectable).toHaveBeenCalledWith(
          wrapper,
          wrapper.host,
          contextId,
          inquirer,
        );
        expect(scopedFilter.catch).toHaveBeenCalledWith(exception, host);
      });

      it('should use the filters without a scope when the host is unknown', async () => {
        await exceptionFilter
          .create({}, callback, 'moduleKey', { id: 1 }, 'unknown')
          .next(exception, host);

        expect(Injector.prototype.loadInjectable).not.toHaveBeenCalled();
        expect(sharedFilter.catch).toHaveBeenCalledWith(exception, host);
      });

      it('should use the filters without a scope for a host other than http', async () => {
        host.setType('ws');

        await exceptionFilter
          .create({}, callback, undefined!)
          .next(exception, host);

        expect(req[REQUEST_CONTEXT_ID]).toBeUndefined();
        expect(Injector.prototype.loadInjectable).not.toHaveBeenCalled();
        expect(sharedFilter.catch).toHaveBeenCalledWith(exception, host);
      });

      it('should use the filters without a scope for a frozen request', async () => {
        const frozenHost = new ExecutionContextHost([Object.freeze({}), {}]);

        await exceptionFilter
          .create({}, callback, undefined!)
          .next(exception, frozenHost);

        expect(Injector.prototype.loadInjectable).not.toHaveBeenCalled();
        expect(sharedFilter.catch).toHaveBeenCalledWith(exception, frozenHost);
      });

      it('should pass the load error to the filters without a scope', async () => {
        const error = new Error('cannot be instantiated');
        vi.spyOn(Injector.prototype, 'loadInjectable').mockRejectedValue(error);

        await exceptionFilter
          .create({}, callback, undefined!)
          .next(exception, host);

        expect(scopedFilter.catch).not.toHaveBeenCalled();
        expect(sharedFilter.catch).toHaveBeenCalledWith(error, host);
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
