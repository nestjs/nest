import { ApplicationConfig } from '../../application-config.js';
import { NestContainer } from '../../injector/container.js';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';
import { PipesContextCreator } from '../../pipes/pipes-context-creator.js';

class Pipe {}

describe('PipesContextCreator', () => {
  let creator: PipesContextCreator;
  let container: NestContainer;
  let applicationConfig: ApplicationConfig;

  beforeEach(() => {
    container = new NestContainer();
    applicationConfig = new ApplicationConfig();
    creator = new PipesContextCreator(container, applicationConfig);
  });
  describe('createConcreteContext', () => {
    describe('when metadata is empty or undefined', () => {
      it('should return empty array', () => {
        expect(creator.createConcreteContext(undefined!)).toEqual([]);
        expect(creator.createConcreteContext([])).toEqual([]);
      });
    });
    describe('when metadata is not empty or undefined', () => {
      const metadata = [null, {}, { transform: () => ({}) }];
      it('should return expected array', () => {
        const transforms = creator.createConcreteContext(metadata as any);
        expect(transforms).toHaveLength(1);
      });
    });
  });
  describe('getPipeInstance', () => {
    describe('when param is an object', () => {
      it('should return instance', () => {
        const instance = { transform: () => null };
        expect(creator.getPipeInstance(instance)).toEqual(instance);
      });
    });
    describe('when param is a constructor', () => {
      it('should pick instance from container', () => {
        const wrapper: InstanceWrapper = {
          instance: 'test',
          getInstanceByContextId: () => wrapper,
        } as any;
        vi.spyOn(creator, 'getInstanceByMetatype').mockImplementation(
          () => wrapper,
        );
        expect(creator.getPipeInstance(Pipe)).toEqual(wrapper.instance);
      });
      it('should return null', () => {
        vi.spyOn(creator, 'getInstanceByMetatype').mockImplementation(
          () => null!,
        );
        expect(creator.getPipeInstance(Pipe)).toEqual(null);
      });
    });
  });

  describe('getInstanceByMetatype', () => {
    describe('when "moduleContext" is nil', () => {
      it('should return undefined', () => {
        (creator as any).moduleContext = undefined;
        expect(creator.getInstanceByMetatype(null!)).toBeUndefined();
      });
    });
    describe('when "moduleContext" is not nil', () => {
      beforeEach(() => {
        (creator as any).moduleContext = 'test';
      });

      describe('and when module exists', () => {
        it('should return undefined', () => {
          vi.spyOn(container.getModules(), 'get').mockImplementation(
            () => undefined,
          );
          expect(creator.getInstanceByMetatype(null!)).toBeUndefined();
        });
      });

      describe('and when module does not exist', () => {
        it('should return instance', () => {
          const instance = { test: true };
          const module = { injectables: { get: () => instance } };
          vi.spyOn(container.getModules(), 'get').mockImplementation(
            () => module as any,
          );
          expect(creator.getInstanceByMetatype(class Test {})).toEqual(
            instance,
          );
        });
      });
    });
  });

  describe('getGlobalMetadata', () => {
    describe('when contextId is static and inquirerId is nil', () => {
      it('should return global pipes', () => {
        const expectedResult = applicationConfig.getGlobalPipes();
        expect(creator.getGlobalMetadata()).toBe(expectedResult);
      });
    });
    describe('otherwise', () => {
      it('should merge static global with request/transient scoped pipes', () => {
        const globalPipes: any = ['test'];
        const instanceWrapper = new InstanceWrapper();
        const instance = 'request-scoped';
        const scopedPipeWrappers = [instanceWrapper];

        vi.spyOn(applicationConfig, 'getGlobalPipes').mockImplementation(
          () => globalPipes,
        );
        vi.spyOn(applicationConfig, 'getGlobalRequestPipes').mockImplementation(
          () => scopedPipeWrappers,
        );
        vi.spyOn(instanceWrapper, 'getInstanceByContextId').mockImplementation(
          () => ({ instance }) as any,
        );

        expect(creator.getGlobalMetadata({ id: 3 })).toEqual(
          expect.arrayContaining([instance, ...globalPipes]),
        );
      });
    });
  });
});
