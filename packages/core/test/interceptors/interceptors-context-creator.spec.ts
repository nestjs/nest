import { expect } from 'chai';
import { of } from 'rxjs';
import * as sinon from 'sinon';
import { ApplicationConfig } from '../../application-config';
import { InstanceWrapper } from '../../injector/instance-wrapper';
import { InterceptorsContextCreator } from '../../interceptors/interceptors-context-creator';
import {
  NestRouterRenderInterceptor,
  NestInterceptorType,
} from '../../../common/interfaces';

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
      it('should filter out metadata without name, intercept or renderIntercept', () => {
        const metadata = [
          {
            name: 'name',
          },
          {
            intercept: () => {},
          },
          {
            renderIntercept: () => {},
          },
          {},
        ];
        const getInterceptorInstanceSpy = sinon.spy(
          interceptorsContextCreator,
          'getInterceptorInstance',
        );
        interceptorsContextCreator.createConcreteContext(metadata);
        expect(getInterceptorInstanceSpy.calledWith(metadata[0] as any)).to.be
          .true;
        expect(getInterceptorInstanceSpy.calledWith(metadata[1] as any)).to.be
          .true;
        expect(getInterceptorInstanceSpy.calledWith(metadata[2] as any)).to.be
          .true;
        expect(getInterceptorInstanceSpy.calledWith(metadata[3] as any)).to.be
          .false;
      });
      it('should filter out interceptors without intercept or renderIntercept', () => {
        const metadata = [
          {
            name: 'intercept',
          },
          {
            name: 'renderIntercept',
          },
          {
            name: 'exclude',
          },
        ];
        type WithPropertiesAny<T> = {
          [P in keyof T]: any;
        };
        type InterceptShape = WithPropertiesAny<NestInterceptorType>;
        type RenderShape = WithPropertiesAny<NestRouterRenderInterceptor>;

        const interceptInterceptor: InterceptShape = {
          intercept: () => {},
        };
        const renderInterceptor: RenderShape = {
          renderIntercept: () => {},
        };
        sinon
          .stub(interceptorsContextCreator, 'getInterceptorInstance')
          .callsFake(interceptor => {
            const name = (interceptor as any).name as string;
            switch (name) {
              case 'intercept':
                return interceptInterceptor;
              case 'renderIntercept':
                return renderInterceptor;
              case 'exclude':
                return {} as any;
            }
          });
        const concreteContext = interceptorsContextCreator.createConcreteContext(
          metadata,
        );

        expect(concreteContext.length).to.be.eql(2);
        expect(concreteContext[0]).to.be.equal(interceptInterceptor);
        expect(concreteContext[1]).to.be.equal(renderInterceptor);
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
      it('should return instance when has renderIntercept', () => {
        const renderIntercept: keyof NestRouterRenderInterceptor =
          'renderIntercept';
        const instance = { [renderIntercept]: () => null };
        expect(
          interceptorsContextCreator.getInterceptorInstance(instance),
        ).to.be.equal(instance);
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
