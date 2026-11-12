import { Scope } from '@nestjs/common';
import { NestContainer } from '@nestjs/core/injector/container.js';
import { Catch } from '../../../common/decorators/core/catch.decorator.js';
import { UseFilters } from '../../../common/decorators/core/exception-filters.decorator.js';
import { ApplicationConfig } from '../../../core/application-config.js';
import { InstanceWrapper } from '../../../core/injector/instance-wrapper.js';
import { ExceptionFiltersContext } from '../../context/exception-filters-context.js';

describe('ExceptionFiltersContext', () => {
  let applicationConfig: ApplicationConfig;
  let exceptionFilter: ExceptionFiltersContext;

  class CustomException {}
  @Catch(CustomException)
  class ExceptionFilter {
    public catch(exc, res) {}
  }

  beforeEach(() => {
    applicationConfig = new ApplicationConfig();
    exceptionFilter = new ExceptionFiltersContext(
      new NestContainer(),
      applicationConfig as any,
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
    describe('when a scoped filter has not been instantiated for the context', () => {
      const contextId = { id: 4 };
      const inquirerId = 'controller';
      const createConstructedWrapper = (scope: Scope) => {
        const wrapper = new InstanceWrapper({
          metatype: ExceptionFilter,
          scope,
        });
        const instance = new ExceptionFilter();
        wrapper.setInstanceByContextId(
          contextId,
          { instance, isResolved: true, isConstructorCalled: true },
          inquirerId,
        );
        return { wrapper, instance };
      };

      it.each([
        ['request-scoped', Scope.REQUEST],
        ['transient', Scope.TRANSIENT],
      ])('should leave out the placeholder of a %s filter', (_, scope) => {
        // An object made from the prototype, whose constructor never ran
        const placeholderWrapper = new InstanceWrapper({
          metatype: ExceptionFilter,
          scope,
          instance: Object.create(ExceptionFilter.prototype),
        });
        const constructed = createConstructedWrapper(scope);
        vi.spyOn(applicationConfig, 'getGlobalFilters').mockReturnValue([]);
        vi.spyOn(applicationConfig, 'getGlobalRequestFilters').mockReturnValue([
          placeholderWrapper,
          constructed.wrapper,
        ]);

        expect(
          exceptionFilter.getGlobalMetadata(contextId, inquirerId),
        ).toEqual([constructed.instance]);
      });

      it('should keep a filter given as a factory provider', () => {
        const instance = { catch: () => null };
        const factoryWrapper = new InstanceWrapper({
          metatype: () => instance,
          inject: [],
          scope: Scope.REQUEST,
        });
        factoryWrapper.setInstanceByContextId(contextId, {
          instance,
          isResolved: true,
        });
        vi.spyOn(applicationConfig, 'getGlobalFilters').mockReturnValue([]);
        vi.spyOn(applicationConfig, 'getGlobalRequestFilters').mockReturnValue([
          factoryWrapper,
        ]);

        expect(exceptionFilter.getGlobalMetadata(contextId)).toEqual([
          instance,
        ]);
      });
    });
  });
});
