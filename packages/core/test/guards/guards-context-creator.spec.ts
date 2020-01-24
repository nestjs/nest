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

  beforeEach(() => {
    guards = [
      {
        name: 'test',
        instance: {
          canActivate: () => true,
        },
        getInstanceByContextId: () => guards[0],
      },
      {
        name: 'test2',
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
        ['test', guards[0]],
        ['test2', guards[1]],
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
        // tslint:disable-next-line:no-string-literal
        guardsContextCreator['moduleContext'] = 'test';
      });
      it('should filter metatypes', () => {
        expect(
          guardsContextCreator.createConcreteContext(guards),
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

      describe('and when module exists', () => {
        it('should return undefined', () => {
          expect(guardsContextCreator.getInstanceByMetatype({})).to.be
            .undefined;
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
