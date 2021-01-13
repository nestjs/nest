import { expect } from 'chai';
import * as sinon from 'sinon';
import { ApplicationConfig } from '../../application-config';
import { GuardsContextCreator } from '../../guards/guards-context-creator';
import { InstanceWrapper } from '../../injector/instance-wrapper';

class Guard {}

describe('GuardsContextCreator', () => {
  let guardsContextCreator: GuardsContextCreator;
  let applicationConfig: ApplicationConfig;
  let guards: any[];
  let container: any;
  let getSpy: sinon.SinonSpy;

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
    getSpy = sinon.stub().returns({
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
      it('should returns empty array', () => {
        const result = guardsContextCreator.createConcreteContext(guards);
        expect(result).to.be.empty;
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
        ).to.have.length(2);
      });
    });
  });

  describe('getGuardInstance', () => {
    describe('when param is an object', () => {
      it('should return instance', () => {
        const instance = { canActivate: () => null };
        expect(guardsContextCreator.getGuardInstance(instance)).to.be.eql(
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
        sinon
          .stub(guardsContextCreator, 'getInstanceByMetatype')
          .callsFake(() => wrapper as any);
        expect(guardsContextCreator.getGuardInstance(Guard)).to.be.eql(
          wrapper.instance,
        );
      });
      it('should return null', () => {
        sinon
          .stub(guardsContextCreator, 'getInstanceByMetatype')
          .callsFake(() => null);
        expect(guardsContextCreator.getGuardInstance(Guard)).to.be.eql(null);
      });
    });
  });

  describe('getInstanceByMetatype', () => {
    describe('when "moduleContext" is nil', () => {
      it('should return undefined', () => {
        (guardsContextCreator as any).moduleContext = undefined;
        expect(guardsContextCreator.getInstanceByMetatype(null)).to.be
          .undefined;
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
          ).to.be.undefined;
        });
      });
    });
  });

  describe('getGlobalMetadata', () => {
    describe('when contextId is static and inquirerId is nil', () => {
      it('should return global guards', () => {
        const expectedResult = applicationConfig.getGlobalGuards();
        expect(guardsContextCreator.getGlobalMetadata()).to.be.equal(
          expectedResult,
        );
      });
    });
    describe('otherwise', () => {
      it('should merge static global with request/transient scoped guards', () => {
        const globalGuards: any = ['test'];
        const instanceWrapper = new InstanceWrapper();
        const instance = 'request-scoped';
        const scopedGuardWrappers = [instanceWrapper];

        sinon
          .stub(applicationConfig, 'getGlobalGuards')
          .callsFake(() => globalGuards);
        sinon
          .stub(applicationConfig, 'getGlobalRequestGuards')
          .callsFake(() => scopedGuardWrappers);
        sinon
          .stub(instanceWrapper, 'getInstanceByContextId')
          .callsFake(() => ({ instance } as any));

        expect(guardsContextCreator.getGlobalMetadata({ id: 3 })).to.contains(
          instance,
          ...globalGuards,
        );
      });
    });
  });
});
