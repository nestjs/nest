import { expect } from 'chai';
import * as sinon from 'sinon';
import { GuardsContextCreator } from '../../guards/guards-context-creator';

class Guard {}

describe('GuardsContextCreator', () => {
  let guardsContextCreator: GuardsContextCreator;
  let guards: any[];
  let container;
  let getSpy;

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
      injectables: new Map([['test', guards[0]], ['test2', guards[1]]]),
    });
    container = {
      getModules: () => ({
        get: getSpy,
      }),
    };
    guardsContextCreator = new GuardsContextCreator(container as any);
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
          .callsFake(() => wrapper);
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
});
