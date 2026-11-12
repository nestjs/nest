import { Scope } from '../../../common/interfaces/scope-options.interface.js';
import { ApplicationConfig } from '../../application-config.js';
import {
  areScopedGlobalFiltersDurable,
  bindRequestContext,
  findFilterInquirer,
  hasUnconstructedScopedGlobalFilter,
  loadScopedGlobalFilters,
} from '../../exceptions/scoped-global-exception-filters.js';
import { NestContainer } from '../../injector/container.js';
import { Injector } from '../../injector/injector.js';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';
import { Module } from '../../injector/module.js';
import { REQUEST_CONTEXT_ID } from '../../router/request/request-constants.js';

describe('scoped global exception filters', () => {
  let config: ApplicationConfig;
  let container: NestContainer;

  beforeEach(() => {
    config = new ApplicationConfig();
    container = new NestContainer();
  });

  describe('hasUnconstructedScopedGlobalFilter', () => {
    it('should be false without scoped global filters', () => {
      expect(hasUnconstructedScopedGlobalFilter(config)).toBe(false);
    });

    it('should be false when every transient filter has a static tree', () => {
      config.addGlobalRequestFilter(
        new InstanceWrapper({ scope: Scope.TRANSIENT }),
      );
      expect(hasUnconstructedScopedGlobalFilter(config)).toBe(false);
    });

    it('should be true with a request-scoped filter', () => {
      config.addGlobalRequestFilter(
        new InstanceWrapper({ scope: Scope.REQUEST }),
      );
      expect(hasUnconstructedScopedGlobalFilter(config)).toBe(true);
    });
  });

  describe('areScopedGlobalFiltersDurable', () => {
    it('should be false without a request-scoped filter', () => {
      config.addGlobalRequestFilter(
        new InstanceWrapper({ scope: Scope.TRANSIENT }),
      );
      expect(areScopedGlobalFiltersDurable(config)).toBe(false);
    });

    it('should follow the request-scoped filters', () => {
      const durable = new InstanceWrapper({ scope: Scope.REQUEST });
      const nonDurable = new InstanceWrapper({ scope: Scope.REQUEST });
      vi.spyOn(durable, 'isDependencyTreeDurable').mockReturnValue(true);
      vi.spyOn(nonDurable, 'isDependencyTreeDurable').mockReturnValue(false);

      config.addGlobalRequestFilter(durable);
      expect(areScopedGlobalFiltersDurable(config)).toBe(true);

      config.addGlobalRequestFilter(nonDurable);
      expect(areScopedGlobalFiltersDurable(config)).toBe(false);
    });
  });

  describe('bindRequestContext', () => {
    beforeEach(() => {
      config.addGlobalRequestFilter(
        new InstanceWrapper({ scope: Scope.REQUEST }),
      );
      vi.spyOn(container, 'registerRequestProvider').mockImplementation(
        () => {},
      );
    });

    it('should store the context id on the request and register it once', () => {
      const request = {};

      const contextId = bindRequestContext(container, config, request);

      expect(request[REQUEST_CONTEXT_ID]).toBe(contextId);
      expect(container.registerRequestProvider).toHaveBeenCalledWith(
        request,
        contextId,
      );
      expect(bindRequestContext(container, config, request)).toBe(contextId);
      expect(container.registerRequestProvider).toHaveBeenCalledTimes(1);
    });

    it('should reuse the context id the request already has', () => {
      const contextId = { id: 1 };
      const request = { [REQUEST_CONTEXT_ID]: contextId };

      expect(bindRequestContext(container, config, request)).toBe(contextId);
      expect(container.registerRequestProvider).not.toHaveBeenCalled();
    });
  });

  describe('loadScopedGlobalFilters', () => {
    const contextId = { id: 2 };
    let injector: Injector;
    let wrapper: InstanceWrapper;

    beforeEach(() => {
      injector = new Injector();
      wrapper = new InstanceWrapper({
        scope: Scope.TRANSIENT,
        host: new Module(class HostModule {}, container),
      });
      config.addGlobalRequestFilter(wrapper);
      vi.spyOn(injector, 'loadInjectable').mockResolvedValue(undefined);
    });

    it('should load each filter under the given inquirer', async () => {
      const inquirer = new InstanceWrapper();

      await loadScopedGlobalFilters(injector, config, contextId, inquirer);

      expect(injector.loadInjectable).toHaveBeenCalledWith(
        wrapper,
        wrapper.host,
        contextId,
        inquirer,
      );
    });

    it('should make each filter its own inquirer without one', async () => {
      await loadScopedGlobalFilters(injector, config, contextId);

      expect(injector.loadInjectable).toHaveBeenCalledWith(
        wrapper,
        wrapper.host,
        contextId,
        wrapper,
      );
    });

    it('should skip a filter that has no host module', async () => {
      config.addGlobalRequestFilter(
        new InstanceWrapper({ scope: Scope.REQUEST }),
      );

      await loadScopedGlobalFilters(injector, config, contextId);

      expect(injector.loadInjectable).toHaveBeenCalledTimes(1);
    });
  });

  describe('findFilterInquirer', () => {
    it('should find a provider or a controller of the module by id', () => {
      const provider = new InstanceWrapper();
      const controller = new InstanceWrapper();
      const moduleRef = new Module(class HostModule {}, container);
      vi.spyOn(moduleRef, 'getProviderById').mockImplementation(id =>
        id === provider.id ? provider : undefined,
      );
      vi.spyOn(moduleRef, 'getControllerById').mockImplementation(id =>
        id === controller.id ? controller : undefined,
      );
      vi.spyOn(container, 'getModules').mockReturnValue(
        new Map([['moduleKey', moduleRef]]) as ReturnType<
          NestContainer['getModules']
        >,
      );

      expect(findFilterInquirer(container, 'moduleKey', provider.id)).toBe(
        provider,
      );
      expect(findFilterInquirer(container, 'moduleKey', controller.id)).toBe(
        controller,
      );
      expect(
        findFilterInquirer(container, 'moduleKey', 'unknown'),
      ).toBeUndefined();
      expect(
        findFilterInquirer(container, 'unknown', provider.id),
      ).toBeUndefined();
    });
  });
});
