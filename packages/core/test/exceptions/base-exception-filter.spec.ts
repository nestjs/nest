import { BaseExceptionFilterContext } from '../../exceptions/base-exception-filter-context.js';
import { NestContainer } from '../../injector/container.js';

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
          getInstanceByContextId: () => wrapper,
        };
        vi.spyOn(filter, 'getInstanceByMetatype').mockImplementation(
          () => wrapper as any,
        );
        expect(filter.getFilterInstance(Filter)).toEqual(wrapper.instance);
      });
      it('should return null', () => {
        vi.spyOn(filter, 'getInstanceByMetatype').mockImplementation(
          () => null!,
        );
        expect(filter.getFilterInstance(Filter)).toEqual(null);
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
