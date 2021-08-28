import { Scope } from '@nestjs/common';
import * as sinon from 'sinon';
import { STATIC_CONTEXT } from '../../injector/constants';
import { InstanceWrapper } from '../../injector/instance-wrapper';

class TestClass {}

describe('InstanceWrapper', () => {
  describe('initialize', () => {
    const partial = {
      name: 'test',
      metatype: TestClass,
      scope: Scope.DEFAULT,
      instance: new TestClass(),
    };
    it('should assign partial', () => {
      const instance = new InstanceWrapper(partial);

      expect(instance.name).toEqual(partial.name);
      expect(instance.scope).toEqual(partial.scope);
      expect(instance.metatype).toEqual(partial.metatype);
    });
    it('should set instance by context id', () => {
      const instance = new InstanceWrapper(partial);

      expect(
        instance.getInstanceByContextId(STATIC_CONTEXT).instance,
      ).toEqual(partial.instance);
    });
  });

  describe('isDependencyTreeStatic', () => {
    describe('when request scoped', () => {
      it('should return false', () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.REQUEST,
        });
        expect(wrapper.isDependencyTreeStatic()).toBeFalsy();
      });
    });
    describe('when statically scoped', () => {
      describe('dependencies', () => {
        describe('when each is static', () => {
          it('should return true', () => {
            const wrapper = new InstanceWrapper();
            wrapper.addCtorMetadata(0, new InstanceWrapper());
            expect(wrapper.isDependencyTreeStatic()).toBeTruthy();
          });
        });
        describe('when one is not static', () => {
          it('should return false', () => {
            const wrapper = new InstanceWrapper();
            wrapper.addCtorMetadata(0, new InstanceWrapper());
            wrapper.addCtorMetadata(
              1,
              new InstanceWrapper({
                scope: Scope.REQUEST,
              }),
            );
            expect(wrapper.isDependencyTreeStatic()).toBeFalsy();
          });
        });
      });
      describe('properties', () => {
        describe('when each is static', () => {
          it('should return true', () => {
            const wrapper = new InstanceWrapper();
            wrapper.addPropertiesMetadata('key1', new InstanceWrapper());
            wrapper.addPropertiesMetadata('key2', new InstanceWrapper());
            expect(wrapper.isDependencyTreeStatic()).toBeTruthy();
          });
        });
        describe('when one is not static', () => {
          it('should return false', () => {
            const wrapper = new InstanceWrapper();
            wrapper.addPropertiesMetadata(
              'key1',
              new InstanceWrapper({ scope: Scope.REQUEST }),
            );
            wrapper.addPropertiesMetadata('key2', new InstanceWrapper());
            expect(wrapper.isDependencyTreeStatic()).toBeFalsy();
          });
        });
      });
      describe('enhancers', () => {
        describe('when each is static', () => {
          it('should return true', () => {
            const wrapper = new InstanceWrapper();
            wrapper.addEnhancerMetadata(new InstanceWrapper());
            wrapper.addEnhancerMetadata(new InstanceWrapper());
            expect(wrapper.isDependencyTreeStatic()).toBeTruthy();
          });
        });
        describe('when one is not static', () => {
          it('should return false', () => {
            const wrapper = new InstanceWrapper();
            wrapper.addEnhancerMetadata(
              new InstanceWrapper({ scope: Scope.REQUEST }),
            );
            wrapper.addEnhancerMetadata(new InstanceWrapper());
            expect(wrapper.isDependencyTreeStatic()).toBeFalsy();
          });
        });
      });
    });
  });

  describe('isNotMetatype', () => {
    describe('when metatype is nil', () => {
      it('should return true', () => {
        const instance = new InstanceWrapper({ metatype: null });
        expect(instance.isNotMetatype).toBeTruthy();
      });
    });
    describe('when metatype is not nil', () => {
      it('should return false', () => {
        const instance = new InstanceWrapper({ metatype: TestClass });
        expect(instance.isNotMetatype).toBeFalsy();
      });
    });
  });

  describe('addEnhancerMetadata', () => {
    it('should add enhancers metadata', () => {
      const instance = new InstanceWrapper();
      const enhancers = [new InstanceWrapper()];
      instance.addEnhancerMetadata(enhancers[0]);
      expect(instance.getEnhancersMetadata()).toEqual(enhancers);
    });
  });

  describe('when set instance has been called', () => {
    it('should set static context value', () => {
      const instance = { test: true };
      const wrapper = new InstanceWrapper();
      wrapper.instance = instance;

      expect(wrapper.getInstanceByContextId(STATIC_CONTEXT).instance).toEqual(
        instance,
      );
    });
  });

  describe('cloneStaticInstance', () => {
    describe('when wrapper is static', () => {
      it('should return static instance', () => {
        const instance = { test: true };
        const wrapper = new InstanceWrapper({ instance });

        expect(wrapper.cloneStaticInstance({ id: 0 }).instance).toEqual(
          instance,
        );
      });
    });
    describe('when wrapper is not static', () => {
      it('should clone instance by context id', () => {
        const instance = { test: true };
        const wrapper = new InstanceWrapper({ instance, scope: Scope.REQUEST });

        expect(wrapper.cloneStaticInstance({ id: 0 }).instance).toBeUndefined();
      });
    });
  });

  describe('getInstanceByContextId', () => {
    describe('when transient and inquirer has been passed', () => {
      it('should call "getInstanceByInquirerId"', () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.TRANSIENT,
        });
        const getInstanceByInquirerIdSpy = sinon.spy(
          wrapper,
          'getInstanceByInquirerId',
        );
        wrapper.getInstanceByContextId(STATIC_CONTEXT, 'inquirerId');
        expect(getInstanceByInquirerIdSpy.called).toBeTruthy();
      });
    });
  });

  describe('setInstanceByContextId', () => {
    describe('when transient and inquirer has been passed', () => {
      it('should call "setInstanceByInquirerId"', () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.TRANSIENT,
        });
        const setInstanceByInquirerIdSpy = sinon.spy(
          wrapper,
          'setInstanceByInquirerId',
        );
        wrapper.setInstanceByContextId(
          STATIC_CONTEXT,
          { instance: {} },
          'inquirerId',
        );
        expect(setInstanceByInquirerIdSpy.called).toBeTruthy();
      });
    });
  });

  describe('isInRequestScope', () => {
    describe('when tree and context are not static and is not transient', () => {
      it('should return true', () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.REQUEST,
        });
        expect(wrapper.isInRequestScope({ id: 3 })).toBeTruthy();
      });
    });
    describe('otherwise', () => {
      it('should return false', () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.TRANSIENT,
        });
        expect(wrapper.isInRequestScope({ id: 3 })).toBeFalsy();

        const wrapper2 = new InstanceWrapper({
          scope: Scope.REQUEST,
        });
        expect(wrapper2.isInRequestScope(STATIC_CONTEXT)).toBeFalsy();
      });
    });
  });

  describe('isLazyTransient', () => {
    describe('when inquirer is request scoped and context is not static and is transient', () => {
      it('should return true', () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.TRANSIENT,
        });
        expect(
          wrapper.isLazyTransient(
            { id: 3 },
            new InstanceWrapper({
              scope: Scope.REQUEST,
            }),
          ),
        ).toBeTruthy();
      });
    });
    describe('otherwise', () => {
      it('should return false', () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.TRANSIENT,
        });
        expect(wrapper.isLazyTransient({ id: 3 }, new InstanceWrapper())).toBeFalsy();

        const wrapper2 = new InstanceWrapper({
          scope: Scope.REQUEST,
        });
        expect(
          wrapper2.isLazyTransient(
            STATIC_CONTEXT,
            new InstanceWrapper({
              scope: Scope.TRANSIENT,
            }),
          ),
        ).toBeFalsy();
      });
    });
  });

  describe('isStatic', () => {
    describe('when inquirer is not request scoped and context and tree are static', () => {
      it('should return true', () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.DEFAULT,
        });
        expect(
          wrapper.isStatic(
            STATIC_CONTEXT,
            new InstanceWrapper({
              scope: Scope.DEFAULT,
            }),
          ),
        ).toBeTruthy();
      });
    });
    describe('otherwise', () => {
      it('should return false', () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.REQUEST,
        });
        expect(wrapper.isStatic({ id: 3 }, new InstanceWrapper())).toBeFalsy();

        const wrapper2 = new InstanceWrapper({
          scope: Scope.TRANSIENT,
        });
        expect(
          wrapper2.isStatic(
            STATIC_CONTEXT,
            new InstanceWrapper({
              scope: Scope.REQUEST,
            }),
          ),
        ).toBeFalsy();
      });
    });
  });

  describe('getStaticTransientInstances', () => {
    describe('when instance is not transient', () => {
      it('should return an empty array', () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.DEFAULT,
        });
        expect(wrapper.getStaticTransientInstances()).toEqual([]);
      });
    });
    describe('when instance is transient', () => {
      it('should return all static instances', () => {
        const wrapper = new InstanceWrapper({
          scope: Scope.TRANSIENT,
        });
        const instanceHost = {
          instance: {},
        };
        wrapper.setInstanceByInquirerId(STATIC_CONTEXT, 'test', instanceHost);
        expect(wrapper.getStaticTransientInstances()).toEqual([instanceHost]);
      });
    });
  });
});
