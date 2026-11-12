import { Catch } from '../../../common/decorators/core/catch.decorator.js';
import { UseFilters } from '../../../common/decorators/core/exception-filters.decorator.js';
import { Scope } from '../../../common/interfaces/scope-options.interface.js';
import { ApplicationConfig } from '../../application-config.js';
import { ExecutionContextHost } from '../../helpers/execution-context-host.js';
import { STATIC_CONTEXT } from '../../injector/constants.js';
import { NestContainer } from '../../injector/container.js';
import { Injector } from '../../injector/injector.js';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';
import { REQUEST_CONTEXT_ID } from '../../router/request/request-constants.js';
import { RouterExceptionFilters } from '../../router/router-exception-filters.js';
import { NoopHttpAdapter } from '../utils/noop-adapter.js';

describe('RouterExceptionFilters', () => {
  let applicationConfig: ApplicationConfig;
  let container: NestContainer;
  let injector: Injector;
  let exceptionFilter: RouterExceptionFilters;

  class CustomException {}
  @Catch(CustomException)
  class ExceptionFilter {
    public catch(exc, res) {}
  }

  beforeEach(() => {
    applicationConfig = new ApplicationConfig();
    container = new NestContainer();
    injector = new Injector();
    exceptionFilter = new RouterExceptionFilters(
      container,
      applicationConfig,
      new NoopHttpAdapter({}),
      injector,
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
          undefined,
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
          undefined,
        );
        expect((filter as any).filters).not.toHaveLength(0);
      });
    });
    describe('when there are request-scoped or transient global filters', () => {
      @Catch()
      class CatchAllFilter {
        public catch(exc, res) {}
      }
      const exception = new CustomException() as any;
      let wrapper: InstanceWrapper;
      let scopedFilter: ExceptionFilter;
      let sharedFilter: CatchAllFilter;
      let req: object;
      let host: ExecutionContextHost;

      beforeEach(() => {
        wrapper = new InstanceWrapper({
          scope: Scope.TRANSIENT,
          host: {} as any,
        });
        scopedFilter = new ExceptionFilter();
        sharedFilter = new CatchAllFilter();
        req = {};
        host = new ExecutionContextHost([req, {}]);

        applicationConfig.addGlobalRequestFilter(wrapper);
        applicationConfig.addGlobalFilter(sharedFilter);
        vi.spyOn(scopedFilter, 'catch');
        vi.spyOn(sharedFilter, 'catch');
        vi.spyOn(container, 'registerRequestProvider').mockImplementation(
          () => {},
        );
        vi.spyOn(injector, 'loadInjectable').mockImplementation(
          async (item, _, contextId, inquirer) =>
            item.setInstanceByContextId(
              contextId!,
              { instance: scopedFilter, isResolved: true },
              inquirer!.id,
            ),
        );
      });

      it('should instantiate them for the request that has failed', async () => {
        const handler = exceptionFilter.create({}, () => {}, undefined);
        expect(injector.loadInjectable).not.toHaveBeenCalled();

        await handler.next(exception, host);

        const contextId = req[REQUEST_CONTEXT_ID];
        expect(contextId).toBeDefined();
        expect(container.registerRequestProvider).toHaveBeenCalledWith(
          req,
          contextId,
        );
        expect(injector.loadInjectable).toHaveBeenCalledWith(
          wrapper,
          wrapper.host,
          contextId,
          wrapper,
        );
        expect(scopedFilter.catch).toHaveBeenCalledWith(exception, host);
        expect(sharedFilter.catch).not.toHaveBeenCalled();
      });

      it('should reuse the context id of the request', async () => {
        const contextId = { id: 1 };
        req[REQUEST_CONTEXT_ID] = contextId;

        await exceptionFilter
          .create({}, () => {}, undefined)
          .next(exception, host);

        expect(container.registerRequestProvider).not.toHaveBeenCalled();
        expect(injector.loadInjectable).toHaveBeenCalledWith(
          wrapper,
          wrapper.host,
          contextId,
          wrapper,
        );
        expect(scopedFilter.catch).toHaveBeenCalledWith(exception, host);
      });

      it('should instantiate them for the context the handler is created for', async () => {
        // e.g. the one of a request-scoped middleware
        const contextId = { id: 2 };

        await exceptionFilter
          .create({}, () => {}, undefined, contextId)
          .next(exception, host);

        expect(container.registerRequestProvider).not.toHaveBeenCalled();
        expect(injector.loadInjectable).toHaveBeenCalledWith(
          wrapper,
          wrapper.host,
          contextId,
          wrapper,
        );
        expect(scopedFilter.catch).toHaveBeenCalledWith(exception, host);
      });

      it('should pass the error to the filters without a scope when they cannot be instantiated', async () => {
        const error = new Error('cannot be instantiated');
        vi.spyOn(injector, 'loadInjectable').mockRejectedValue(error);

        await exceptionFilter
          .create({}, () => {}, undefined)
          .next(exception, host);

        expect(scopedFilter.catch).not.toHaveBeenCalled();
        expect(sharedFilter.catch).toHaveBeenCalledWith(error, host);
      });

      it('should not instantiate them when the inquirer has already done it', async () => {
        wrapper.setInstanceByContextId(
          STATIC_CONTEXT,
          { instance: scopedFilter, isResolved: true },
          'inquirerId',
        );

        await exceptionFilter
          .create({}, () => {}, undefined, STATIC_CONTEXT, 'inquirerId')
          .next(exception, host);

        expect(injector.loadInjectable).not.toHaveBeenCalled();
        expect(scopedFilter.catch).toHaveBeenCalledWith(exception, host);
      });
    });
  });
  describe('reflectCatchExceptions', () => {
    it('should return FILTER_CATCH_EXCEPTIONS metadata', () => {
      expect(
        exceptionFilter.reflectCatchExceptions(new ExceptionFilter()),
      ).toEqual([CustomException]);
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
        expect(result).toEqual(
          expect.arrayContaining([instance, ...globalFilters]),
        );
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
