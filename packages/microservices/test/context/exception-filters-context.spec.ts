import { NestContainer } from '@nestjs/core/injector/container.js';
import { lastValueFrom, of } from 'rxjs';
import { Catch } from '../../../common/decorators/core/catch.decorator.js';
import { UseFilters } from '../../../common/decorators/core/exception-filters.decorator.js';
import { Scope } from '../../../common/interfaces/scope-options.interface.js';
import { ApplicationConfig } from '../../../core/application-config.js';
import { ExecutionContextHost } from '../../../core/helpers/execution-context-host.js';
import { STATIC_CONTEXT } from '../../../core/injector/constants.js';
import { Injector } from '../../../core/injector/injector.js';
import { InstanceWrapper } from '../../../core/injector/instance-wrapper.js';
import { Module } from '../../../core/injector/module.js';
import { ExceptionFiltersContext } from '../../context/exception-filters-context.js';

describe('ExceptionFiltersContext', () => {
  let applicationConfig: ApplicationConfig;
  let container: NestContainer;
  let exceptionFilter: ExceptionFiltersContext;

  class CustomException {}
  @Catch(CustomException)
  class ExceptionFilter {
    public catch(exc, res) {}
  }

  beforeEach(() => {
    applicationConfig = new ApplicationConfig();
    container = new NestContainer();
    exceptionFilter = new ExceptionFiltersContext(
      container,
      applicationConfig as any,
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
    describe('when a scoped global filter has to be built for the message', () => {
      @Catch()
      class CatchAllFilter {
        public catch(exc, res) {}
      }
      const exception = new CustomException() as Error;
      const callback = () => of({});
      const contextId = { id: 1 };
      let wrapper: InstanceWrapper;
      let controller: InstanceWrapper;
      let scopedFilter: ExceptionFilter;
      let sharedFilter: CatchAllFilter;
      let host: ExecutionContextHost;

      const handle = (handler: ReturnType<ExceptionFiltersContext['create']>) =>
        lastValueFrom(handler.handle(exception, host));

      beforeEach(() => {
        wrapper = new InstanceWrapper({
          scope: Scope.REQUEST,
          host: new Module(class HostModule {}, container),
        });
        controller = new InstanceWrapper();
        scopedFilter = new ExceptionFilter();
        sharedFilter = new CatchAllFilter();
        host = new ExecutionContextHost(['data', {}]);
        host.setType('rpc');

        const moduleRef = new Module(class ControllerModule {}, container);
        vi.spyOn(moduleRef, 'getControllerById').mockImplementation(id =>
          id === controller.id ? controller : undefined,
        );
        vi.spyOn(container, 'getModules').mockReturnValue(
          new Map([['moduleKey', moduleRef]]) as ReturnType<
            NestContainer['getModules']
          >,
        );
        applicationConfig.addGlobalFilter(sharedFilter);
        vi.spyOn(scopedFilter, 'catch').mockReturnValue(of('scoped'));
        vi.spyOn(sharedFilter, 'catch').mockReturnValue(of('shared'));
        vi.spyOn(Injector.prototype, 'loadInjectable').mockImplementation(
          async (item, _, ctx, inquirer) =>
            item.setInstanceByContextId(
              ctx!,
              { instance: scopedFilter, isResolved: true },
              inquirer!.id,
            ),
        );
      });

      describe('with a request-scoped filter', () => {
        beforeEach(() => {
          applicationConfig.addGlobalRequestFilter(wrapper);
        });

        it('should build it for the context under the controller', async () => {
          const handler = exceptionFilter.create(
            {},
            callback,
            'moduleKey',
            contextId,
            controller.id,
          );

          await expect(handle(handler)).resolves.toBe('scoped');
          expect(Injector.prototype.loadInjectable).toHaveBeenCalledWith(
            wrapper,
            wrapper.host,
            contextId,
            controller,
          );
          expect(sharedFilter.catch).not.toHaveBeenCalled();
        });

        it('should not defer a handler created for the static context', async () => {
          const handler = exceptionFilter.create(
            {},
            callback,
            'moduleKey',
            STATIC_CONTEXT,
          );

          await expect(handle(handler)).resolves.toBe('shared');
          expect(Injector.prototype.loadInjectable).not.toHaveBeenCalled();
        });

        it('should use the filters without a scope when the controller is unknown', async () => {
          const handler = exceptionFilter.create(
            {},
            callback,
            'moduleKey',
            contextId,
            'unknown',
          );

          await expect(handle(handler)).resolves.toBe('shared');
          expect(Injector.prototype.loadInjectable).not.toHaveBeenCalled();
          expect(sharedFilter.catch).toHaveBeenCalledWith(exception, host);
        });

        it('should pass the load error to the filters without a scope', async () => {
          const error = new Error('cannot be instantiated');
          vi.spyOn(Injector.prototype, 'loadInjectable').mockRejectedValue(
            error,
          );
          const handler = exceptionFilter.create(
            {},
            callback,
            'moduleKey',
            contextId,
            controller.id,
          );

          await expect(handle(handler)).resolves.toBe('shared');
          expect(scopedFilter.catch).not.toHaveBeenCalled();
          expect(sharedFilter.catch).toHaveBeenCalledWith(error, host);
        });
      });

      it('should build a transient filter under itself without a controller', async () => {
        const transientWrapper = new InstanceWrapper({
          scope: Scope.TRANSIENT,
          host: new Module(class HostModule {}, container),
        });
        vi.spyOn(transientWrapper, 'isDependencyTreeStatic').mockReturnValue(
          false,
        );
        applicationConfig.addGlobalRequestFilter(transientWrapper);

        const handler = exceptionFilter.create(
          {},
          callback,
          'moduleKey',
          contextId,
        );

        await expect(handle(handler)).resolves.toBe('scoped');
        expect(Injector.prototype.loadInjectable).toHaveBeenCalledWith(
          transientWrapper,
          transientWrapper.host,
          contextId,
          transientWrapper,
        );
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
  });
});
