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
      it('should resolve request/transient scoped filters in the order they were bound', () => {
        const instanceWrapper = new InstanceWrapper();
        vi.spyOn(instanceWrapper, 'getInstanceByContextId').mockImplementation(
          () => ({ instance: 'request-scoped' }) as any,
        );
        applicationConfig.addGlobalFilter('first' as any);
        applicationConfig.addGlobalRequestFilter(instanceWrapper);
        applicationConfig.useGlobalFilters('last' as any);

        expect(exceptionFilter.getGlobalMetadata({ id: 3 })).toEqual([
          'first',
          'request-scoped',
          'last',
        ]);
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

        applicationConfig.addGlobalRequestFilter(durableWrapper);
        applicationConfig.addGlobalRequestFilter(requestWrapper);

        expect(exceptionFilter.getGlobalMetadata(contextId)).toEqual([
          'durable',
          'request-scoped',
        ]);
      });
    });
  });
});
