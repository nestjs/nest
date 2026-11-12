import { Scope } from '@nestjs/common';
import { BaseExceptionFilterContext } from '../../exceptions/base-exception-filter-context.js';
import { NestContainer } from '../../injector/container.js';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';

export class Filter {}

describe('BaseExceptionFilterContext', () => {
  let filter: BaseExceptionFilterContext;
  let container: NestContainer;

  beforeEach(() => {
    container = new NestContainer();
    filter = new BaseExceptionFilterContext(container);
  });

  describe('getFilterInstance', () => {
    describe('when param is an object', () => {
      it('should return instance', () => {
        const instance = { catch: () => null };
        expect(filter.getFilterInstance(instance)).toEqual(instance);
      });
    });
    describe('when param is a constructor', () => {
      it('should pick instance from container', () => {
        const wrapper = {
          instance: 'test',
          isConstructorCalled: true,
          getInstanceByContextId: () => wrapper,
        };
        vi.spyOn(filter, 'getInstanceByMetatype').mockImplementation(
          () => wrapper as any,
        );
        expect(filter.getFilterInstance(Filter)).toEqual(wrapper.instance);
      });
      it('should pick the instance from the container when the class also has a static "catch"', () => {
        class WithStatic {
          static catch() {
            return 'static';
          }
          catch() {
            return 'instance';
          }
        }
        const wrapper = {
          instance: new WithStatic(),
          isConstructorCalled: true,
          getInstanceByContextId: () => wrapper,
        };
        vi.spyOn(filter, 'getInstanceByMetatype').mockImplementation(
          () => wrapper as any,
        );
        expect(filter.getFilterInstance(WithStatic)).toBe(wrapper.instance);
      });
      it('should return the class when only the class has a "catch"', () => {
        class StaticOnly {
          static catch() {
            return 'static';
          }
        }
        const wrapper = {
          instance: new StaticOnly(),
          isConstructorCalled: true,
          getInstanceByContextId: () => wrapper,
        };
        vi.spyOn(filter, 'getInstanceByMetatype').mockImplementation(
          () => wrapper as any,
        );
        expect(filter.getFilterInstance(StaticOnly)).toBe(StaticOnly);
      });
      it('should return null', () => {
        vi.spyOn(filter, 'getInstanceByMetatype').mockImplementation(
          () => null!,
        );
        expect(filter.getFilterInstance(Filter)).toEqual(null);
      });
    });
    describe('when the filter has not been instantiated in the context', () => {
      const contextId = { id: 1 };
      const useWrapper = (wrapper: InstanceWrapper) =>
        vi.spyOn(filter, 'getInstanceByMetatype').mockReturnValue(wrapper);

      it('should return null for the placeholder of a request-scoped filter', () => {
        // e.g. the filter of a controller that failed to resolve for the
        // request, looked up in the static context
        const wrapper = new InstanceWrapper({
          metatype: Filter,
          scope: Scope.REQUEST,
          instance: Object.create(Filter.prototype),
        });
        useWrapper(wrapper);

        expect(filter.getFilterInstance(Filter)).toBeNull();
        expect(filter.getFilterInstance(Filter, contextId)).toBeNull();
      });

      it('should return null for the placeholder of a transient filter', () => {
        const wrapper = new InstanceWrapper({
          metatype: Filter,
          scope: Scope.TRANSIENT,
        });
        useWrapper(wrapper);

        expect(filter.getFilterInstance(Filter, contextId, 'host')).toBeNull();
      });

      it('should return the instance once it has been constructed', () => {
        const wrapper = new InstanceWrapper({
          metatype: Filter,
          scope: Scope.REQUEST,
        });
        const instance = new Filter();
        wrapper.setInstanceByContextId(contextId, {
          instance,
          isResolved: true,
          isConstructorCalled: true,
        });
        useWrapper(wrapper);

        expect(filter.getFilterInstance(Filter, contextId)).toBe(instance);
      });

      it('should return the instance of a value or factory provider', () => {
        const instance = { catch: () => null };
        const valueWrapper = new InstanceWrapper({ metatype: null, instance });
        const factoryWrapper = new InstanceWrapper({
          metatype: () => instance,
          inject: [],
          instance,
        });

        useWrapper(valueWrapper);
        expect(filter.getFilterInstance(Filter)).toBe(instance);
        useWrapper(factoryWrapper);
        expect(filter.getFilterInstance(Filter)).toBe(instance);
      });
    });
  });

  describe('getInstanceByMetatype', () => {
    describe('when "moduleContext" is nil', () => {
      it('should return undefined', () => {
        (filter as any).moduleContext = undefined;
        expect(filter.getInstanceByMetatype(null!)).toBeUndefined();
      });
    });
    describe('when "moduleContext" is not nil', () => {
      beforeEach(() => {
        (filter as any).moduleContext = 'test';
      });

      describe('and when module exists', () => {
        it('should return undefined', () => {
          vi.spyOn(container.getModules(), 'get').mockImplementation(
            () => undefined,
          );
          expect(filter.getInstanceByMetatype(null!)).toBeUndefined();
        });
      });

      describe('and when module does not exist', () => {
        it('should return instance', () => {
          const instance = { test: true };
          const module = { injectables: { get: () => instance } };
          vi.spyOn(container.getModules(), 'get').mockImplementation(
            () => module as any,
          );
          expect(filter.getInstanceByMetatype(class {})).toEqual(instance);
        });
      });
    });
  });
});
