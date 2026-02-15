import { of } from 'rxjs';
import { ApplicationConfig } from '../../application-config.js';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';
import { InterceptorsContextCreator } from '../../interceptors/interceptors-context-creator.js';

class Interceptor {}

describe('InterceptorsContextCreator', () => {
  let interceptorsContextCreator: InterceptorsContextCreator;
  let interceptors: any[];
  let applicationConfig: ApplicationConfig;
  let container: any;
  let getSpy: ReturnType<typeof vi.fn>;

  class Interceptor1 {}
  class Interceptor2 {}

  beforeEach(() => {
    interceptors = [
      {
        name: Interceptor1.name,
        token: Interceptor1,
        metatype: Interceptor1,
        getInstanceByContextId: () => interceptors[0],
        instance: {
          intercept: () => of(true),
        },
      },
      {
        name: Interceptor2.name,
        token: Interceptor2,
        metatype: Interceptor2,
        getInstanceByContextId: () => interceptors[1],
        instance: {
          intercept: () => of(true),
        },
      },
      {},
      undefined,
    ];
    getSpy = vi.fn().mockReturnValue({
      injectables: new Map([
        [Interceptor1, interceptors[0]],
        [Interceptor2, interceptors[1]],
      ]),
    });
    container = {
      getModules: () => ({
        get: getSpy,
      }),
    };
    applicationConfig = new ApplicationConfig();
    interceptorsContextCreator = new InterceptorsContextCreator(
      container,
      applicationConfig,
    );
  });
  describe('createConcreteContext', () => {
    describe('when `moduleContext` is nil', () => {
      it('should return empty array', () => {
        const result =
          interceptorsContextCreator.createConcreteContext(interceptors);
        expect(result).toHaveLength(0);
      });
    });
    describe('when `moduleContext` is defined', () => {
      beforeEach(() => {
        interceptorsContextCreator['moduleContext'] = 'test';
      });
      it('should filter metatypes', () => {
        const interceptorTypeRefs = [
          interceptors[0].metatype,
          interceptors[1].instance,
        ];
        expect(
          interceptorsContextCreator.createConcreteContext(interceptorTypeRefs),
        ).toHaveLength(2);
      });
    });
  });

  describe('getInterceptorInstance', () => {
    describe('when param is an object', () => {
      it('should return instance', () => {
        const instance = { intercept: () => null! };
        expect(
          interceptorsContextCreator.getInterceptorInstance(instance),
        ).toEqual(instance);
      });
    });
    describe('when param is a constructor', () => {
      it('should pick instance from container', () => {
        const wrapper: InstanceWrapper = {
          instance: 'test',
          getInstanceByContextId: () => wrapper,
        } as any;
        vi.spyOn(
          interceptorsContextCreator,
          'getInstanceByMetatype',
        ).mockImplementation(() => wrapper);
        expect(
          interceptorsContextCreator.getInterceptorInstance(Interceptor),
        ).toEqual(wrapper.instance);
      });
      it('should return null', () => {
        vi.spyOn(
          interceptorsContextCreator,
          'getInstanceByMetatype',
        ).mockImplementation(() => null!);
        expect(
          interceptorsContextCreator.getInterceptorInstance(Interceptor),
        ).toEqual(null);
      });
    });
  });

  describe('getInstanceByMetatype', () => {
    describe('when "moduleContext" is nil', () => {
      it('should return undefined', () => {
        (interceptorsContextCreator as any).moduleContext = undefined;
        expect(
          interceptorsContextCreator.getInstanceByMetatype(null!),
        ).toBeUndefined();
      });
    });
    describe('when "moduleContext" is not nil', () => {
      beforeEach(() => {
        (interceptorsContextCreator as any).moduleContext = 'test';
      });

      describe('and when module exists', () => {
        it('should return undefined', () => {
          expect(
            interceptorsContextCreator.getInstanceByMetatype(class {}),
          ).toBeUndefined();
        });
      });
    });
  });

  describe('getGlobalMetadata', () => {
    describe('when contextId is static and inquirerId is nil', () => {
      it('should return global interceptors', () => {
        const expectedResult = applicationConfig.getGlobalInterceptors();
        expect(interceptorsContextCreator.getGlobalMetadata()).toBe(
          expectedResult,
        );
      });
    });
    describe('otherwise', () => {
      it('should merge static global with request/transient scoped interceptors', () => {
        const globalInterceptors: any = ['test'];
        const instanceWrapper = new InstanceWrapper();
        const instance = 'request-scoped';
        const scopedInterceptorWrappers = [instanceWrapper];

        vi.spyOn(applicationConfig, 'getGlobalInterceptors').mockImplementation(
          () => globalInterceptors,
        );
        vi.spyOn(
          applicationConfig,
          'getGlobalRequestInterceptors',
        ).mockImplementation(() => scopedInterceptorWrappers);
        vi.spyOn(instanceWrapper, 'getInstanceByContextId').mockImplementation(
          () => ({ instance }) as any,
        );

        expect(interceptorsContextCreator.getGlobalMetadata({ id: 3 })).toEqual(
          expect.arrayContaining([instance, ...globalInterceptors]),
        );
      });
    });
  });
});
