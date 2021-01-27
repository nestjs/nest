import { expect } from 'chai';
import { of } from 'rxjs';
import * as sinon from 'sinon';
import { ApplicationConfig } from '../../application-config';
import { InstanceWrapper } from '../../injector/instance-wrapper';
import { InterceptorsContextCreator } from '../../interceptors/interceptors-context-creator';

class Interceptor {}

describe('InterceptorsContextCreator', () => {
  let interceptorsContextCreator: InterceptorsContextCreator;
  let interceptors: any[];
  let applicationConfig: ApplicationConfig;
  let container: any;
  let getSpy: sinon.SinonSpy;

  beforeEach(() => {
    interceptors = [
      {
        name: 'test',
        getInstanceByContextId: () => interceptors[0],
        instance: {
          intercept: () => of(true),
        },
      },
      {
        name: 'test2',
        getInstanceByContextId: () => interceptors[1],
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
    applicationConfig = new ApplicationConfig();
    interceptorsContextCreator = new InterceptorsContextCreator(
      container as any,
      applicationConfig,
    );
  });
  describe('createConcreteContext', () => {
    describe('when `moduleContext` is nil', () => {
      it('should return empty array', () => {
        const result = interceptorsContextCreator.createConcreteContext(
          interceptors,
        );
        expect(result).to.be.empty;
      });
    });
    describe('when `moduleContext` is defined', () => {
      beforeEach(() => {
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
        const wrapper: InstanceWrapper = {
          instance: 'test',
          getInstanceByContextId: () => wrapper,
        } as any;
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

  describe('getGlobalMetadata', () => {
    describe('when contextId is static and inquirerId is nil', () => {
      it('should return global interceptors', () => {
        const expectedResult = applicationConfig.getGlobalInterceptors();
        expect(interceptorsContextCreator.getGlobalMetadata()).to.be.equal(
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

        sinon
          .stub(applicationConfig, 'getGlobalInterceptors')
          .callsFake(() => globalInterceptors);
        sinon
          .stub(applicationConfig, 'getGlobalRequestInterceptors')
          .callsFake(() => scopedInterceptorWrappers);
        sinon
          .stub(instanceWrapper, 'getInstanceByContextId')
          .callsFake(() => ({ instance } as any));

        expect(
          interceptorsContextCreator.getGlobalMetadata({ id: 3 }),
        ).to.contains(instance, ...globalInterceptors);
      });
    });
  });
});
