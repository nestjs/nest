import { Catch } from '../../../common/decorators/core/catch.decorator.js';
import { UseFilters } from '../../../common/decorators/core/exception-filters.decorator.js';
import { Scope } from '../../../common/interfaces/scope-options.interface.js';
import { ApplicationConfig } from '../../application-config.js';
import { NestContainer } from '../../injector/container.js';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';
import { RouterExceptionFilters } from '../../router/router-exception-filters.js';
import { NoopHttpAdapter } from '../utils/noop-adapter.js';

describe('RouterExceptionFilters', () => {
  let applicationConfig: ApplicationConfig;
  let exceptionFilter: RouterExceptionFilters;

  class CustomException {}
  @Catch(CustomException)
  class ExceptionFilter {
    public catch(exc, res) {}
  }

  beforeEach(() => {
    applicationConfig = new ApplicationConfig();
    exceptionFilter = new RouterExceptionFilters(
      new NestContainer(),
      applicationConfig,
      new NoopHttpAdapter({}),
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
      it('should include scoped enhancers that already have a static instance', () => {
        const instanceWrapper = new InstanceWrapper();
        const requestScopedWrapper = new InstanceWrapper();
        const instance = 'static-transient';

        vi.spyOn(applicationConfig, 'getGlobalFilters').mockImplementation(
          () => ['test'] as any,
        );
        vi.spyOn(
          applicationConfig,
          'getGlobalRequestFilters',
        ).mockImplementation(() => [instanceWrapper, requestScopedWrapper]);
        vi.spyOn(instanceWrapper, 'getInstanceByContextId').mockImplementation(
          () => ({ instance }) as any,
        );

        expect(exceptionFilter.getGlobalMetadata()).toEqual(['test', instance]);
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
