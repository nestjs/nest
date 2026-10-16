import { UseGuards } from '@nestjs/common';
import { ApplicationConfig } from '../../application-config.js';
import { GuardsContextCreator } from '../../guards/guards-context-creator.js';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';

class Guard {}

describe('GuardsContextCreator', () => {
  let guardsContextCreator: GuardsContextCreator;
  let applicationConfig: ApplicationConfig;
  let guards: any[];
  let container: any;
  let getSpy: ReturnType<typeof vi.fn>;

  class Guard1 {}
  class Guard2 {}

  beforeEach(() => {
    guards = [
      {
        name: 'Guard1',
        token: Guard1,
        metatype: Guard1,
        instance: {
          canActivate: () => true,
        },
        getInstanceByContextId: () => guards[0],
      },
      {
        name: 'Guard2',
        token: Guard2,
        metatype: Guard2,
        instance: {
          canActivate: () => true,
        },
        getInstanceByContextId: () => guards[1],
      },
      {},
      undefined,
    ];
    getSpy = vi.fn().mockReturnValue({
      injectables: new Map([
        [Guard1, guards[0]],
        [Guard2, guards[1]],
      ]),
    });
    container = {
      getModules: () => ({
        get: getSpy,
      }),
    };
    applicationConfig = new ApplicationConfig();
    guardsContextCreator = new GuardsContextCreator(
      container,
      applicationConfig,
    );
  });
  describe('createConcreteContext', () => {
    describe('when `moduleContext` is nil', () => {
      it('should return empty array', () => {
        const result = guardsContextCreator.createConcreteContext(guards);
        expect(result).toHaveLength(0);
      });
    });
    describe('when `moduleContext` is defined', () => {
      beforeEach(() => {
        guardsContextCreator['moduleContext'] = 'test';
      });
      it('should filter metatypes', () => {
        const guardTypeRefs = [guards[0].metatype, guards[1].instance];
        expect(
          guardsContextCreator.createConcreteContext(guardTypeRefs),
        ).toHaveLength(2);
      });
    });
  });

  describe('create', () => {
    describe('when the "constructor" of the host prototype was overwritten', () => {
      it('should reflect class-level guards from the registered class', () => {
        @UseGuards(Guard2)
        class Mixin {}
        @UseGuards(Guard1)
        class Host {
          handler() {}
        }
        // What mixin helpers copying every property of the prototype do
        Host.prototype.constructor = Mixin;
        new InstanceWrapper({ metatype: Host });

        const instance = new Host();
        const result = guardsContextCreator.create(
          instance,
          instance.handler,
          'test',
        );
        expect(result).toHaveLength(1);
        expect(result[0]).toBe(guards[0].instance);
      });
    });
  });

  describe('getGuardInstance', () => {
    describe('when param is an object', () => {
      it('should return instance', () => {
        const instance = { canActivate: () => null! };
        expect(guardsContextCreator.getGuardInstance(instance)).toEqual(
          instance,
        );
      });
    });
    describe('when param is a constructor', () => {
      it('should pick instance from container', () => {
        const wrapper = {
          instance: 'test',
          getInstanceByContextId: () => wrapper,
        };
        vi.spyOn(
          guardsContextCreator,
          'getInstanceByMetatype',
        ).mockImplementation(() => wrapper as any);
        expect(guardsContextCreator.getGuardInstance(Guard)).toEqual(
          wrapper.instance,
        );
      });
      it('should return null', () => {
        vi.spyOn(
          guardsContextCreator,
          'getInstanceByMetatype',
        ).mockImplementation(() => null!);
        expect(guardsContextCreator.getGuardInstance(Guard)).toEqual(null);
      });
    });
  });

  describe('getInstanceByMetatype', () => {
    describe('when "moduleContext" is nil', () => {
      it('should return undefined', () => {
        (guardsContextCreator as any).moduleContext = undefined;
        expect(
          guardsContextCreator.getInstanceByMetatype(null!),
        ).toBeUndefined();
      });
    });
    describe('when "moduleContext" is not nil', () => {
      beforeEach(() => {
        (guardsContextCreator as any).moduleContext = 'test';
      });

      describe('but module does not exist', () => {
        it('should return undefined', () => {
          expect(
            guardsContextCreator.getInstanceByMetatype(class RandomModule {}),
          ).toBeUndefined();
        });
      });
    });
  });

  describe('getGlobalMetadata', () => {
    describe('when contextId is static and inquirerId is nil', () => {
      it('should return global guards', () => {
        const expectedResult = applicationConfig.getGlobalGuards();
        expect(guardsContextCreator.getGlobalMetadata()).toBe(expectedResult);
      });
    });
    describe('otherwise', () => {
      it('should resolve request/transient scoped guards in the order they were bound', () => {
        const instanceWrapper = new InstanceWrapper();
        vi.spyOn(instanceWrapper, 'getInstanceByContextId').mockImplementation(
          () => ({ instance: 'request-scoped' }) as any,
        );
        applicationConfig.addGlobalGuard('first' as any);
        applicationConfig.addGlobalRequestGuard(instanceWrapper);
        applicationConfig.useGlobalGuards('last' as any);

        expect(guardsContextCreator.getGlobalMetadata({ id: 3 })).toEqual([
          'first',
          'request-scoped',
          'last',
        ]);
      });

      it('should skip scoped guards with no instance in the context', () => {
        const instanceWrapper = new InstanceWrapper();
        vi.spyOn(instanceWrapper, 'getInstanceByContextId').mockImplementation(
          () => undefined as any,
        );
        applicationConfig.addGlobalRequestGuard(instanceWrapper);
        applicationConfig.addGlobalGuard('static' as any);

        expect(guardsContextCreator.getGlobalMetadata({ id: 3 })).toEqual([
          'static',
        ]);
      });
    });
  });
});
