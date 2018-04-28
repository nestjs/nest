import * as sinon from 'sinon';
import { expect } from 'chai';
import { Observable, of } from 'rxjs';
import { InterceptorsContextCreator } from '../../interceptors/interceptors-context-creator';

class Interceptor {}

describe('InterceptorsContextCreator', () => {
  let interceptorsContextCreator: InterceptorsContextCreator;
  let interceptors: any[];
  let container;
  let getSpy;

  beforeEach(() => {
    interceptors = [
      {
        name: 'test',
        instance: {
          intercept: () => of(true),
        },
      },
      {
        name: 'test2',
        instance: {
          intercept: () => of(true),
        },
      },
      {},
      undefined,
    ];
    getSpy = sinon.stub().returns({
      injectables: new Map([
        ['test', interceptors[0]],
        ['test2', interceptors[1]],
      ]),
    });
    container = {
      getModules: () => ({
        get: getSpy,
      }),
    };
    interceptorsContextCreator = new InterceptorsContextCreator(
      container as any,
    );
  });
  describe('createConcreteContext', () => {
    describe('when `moduleContext` is nil', () => {
      it('should returns empty array', () => {
        const result = interceptorsContextCreator.createConcreteContext(
          interceptors,
        );
        expect(result).to.be.empty;
      });
    });
    describe('when `moduleContext` is defined', () => {
      beforeEach(() => {
        // tslint:disable-next-line:no-string-literal
        interceptorsContextCreator['moduleContext'] = 'test';
      });
      it('should filter metatypes', () => {
        expect(
          interceptorsContextCreator.createConcreteContext(interceptors),
        ).to.have.length(2);
      });
    });
  });

  describe('getInterceptorInstance', () => {
    describe('when param is an object', () => {
      it('should return instance', () => {
        const instance = { intercept: () => null };
        expect(
          interceptorsContextCreator.getInterceptorInstance(instance),
        ).to.be.eql(instance);
      });
    });
    describe('when param is a constructor', () => {
      it('should pick instance from container', () => {
        const wrapper = { instance: 'test' };
        sinon
          .stub(interceptorsContextCreator, 'getInstanceByMetatype')
          .callsFake(() => wrapper);
        expect(
          interceptorsContextCreator.getInterceptorInstance(Interceptor),
        ).to.be.eql(wrapper.instance);
      });
      it('should return null', () => {
        sinon
          .stub(interceptorsContextCreator, 'getInstanceByMetatype')
          .callsFake(() => null);
        expect(
          interceptorsContextCreator.getInterceptorInstance(Interceptor),
        ).to.be.eql(null);
      });
    });
  });

  describe('getInstanceByMetatype', () => {
    describe('when "moduleContext" is nil', () => {
      it('should return undefined', () => {
        (interceptorsContextCreator as any).moduleContext = undefined;
        expect(interceptorsContextCreator.getInstanceByMetatype(null)).to.be
          .undefined;
      });
    });
    describe('when "moduleContext" is not nil', () => {
      beforeEach(() => {
        (interceptorsContextCreator as any).moduleContext = 'test';
      });

      describe('and when module exists', () => {
        it('should return undefined', () => {
          expect(interceptorsContextCreator.getInstanceByMetatype({})).to.be
            .undefined;
        });
      });
    });
  });
});
