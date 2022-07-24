import { ForbiddenException } from '@nestjs/common';
import { CUSTOM_ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { expect } from 'chai';
import { of } from 'rxjs';
import * as sinon from 'sinon';
import { ExternalExceptionFilterContext } from '../../exceptions/external-exception-filter-context';
import { GuardsConsumer } from '../../guards/guards-consumer';
import { GuardsContextCreator } from '../../guards/guards-context-creator';
import { ExternalContextCreator } from '../../helpers/external-context-creator';
import { NestContainer } from '../../injector/container';
import { Module } from '../../injector/module';
import { ModulesContainer } from '../../injector/modules-container';
import { InterceptorsConsumer } from '../../interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '../../interceptors/interceptors-context-creator';
import { PipesConsumer } from '../../pipes/pipes-consumer';
import { PipesContextCreator } from '../../pipes/pipes-context-creator';
import { RouteParamsFactory } from '../../router/route-params-factory';

describe('ExternalContextCreator', () => {
  let contextCreator: ExternalContextCreator;
  let callback: any;
  let bindSpy: sinon.SinonSpy;
  let applySpy: sinon.SinonSpy;
  let guardsConsumer: GuardsConsumer;
  let pipesConsumer: PipesConsumer;
  let guardsContextCreator: GuardsContextCreator;

  beforeEach(() => {
    callback = {
      bind: () => ({}),
      apply: () => ({}),
    };
    bindSpy = sinon.spy(callback, 'bind');
    applySpy = sinon.spy(callback, 'apply');

    guardsConsumer = new GuardsConsumer();
    pipesConsumer = new PipesConsumer();
    guardsContextCreator = new GuardsContextCreator(new NestContainer());
    sinon.stub(guardsContextCreator, 'create').returns([{}] as any);
    contextCreator = new ExternalContextCreator(
      guardsContextCreator,
      guardsConsumer,
      new InterceptorsContextCreator(new NestContainer()),
      new InterceptorsConsumer(),
      new ModulesContainer(),
      new PipesContextCreator(new NestContainer()),
      pipesConsumer,
      new ExternalExceptionFilterContext(new NestContainer()),
    );
  });
  describe('create', () => {
    it('should call "getContextModuleName" with expected argument', done => {
      const getContextModuleKeySpy = sinon.spy(
        contextCreator,
        'getContextModuleKey',
      );
      contextCreator.create({ foo: 'bar' }, callback as any, '', '', null);
      expect(getContextModuleKeySpy.called).to.be.true;
      done();
    });
    describe('returns proxy function', () => {
      let proxyContext;
      let instance;

      beforeEach(() => {
        instance = { foo: 'bar' };
        proxyContext = contextCreator.create(
          instance,
          callback as any,
          '',
          '',
          null,
        );
      });
      it('should be a function', () => {
        expect(proxyContext).to.be.a('function');
      });
      describe('when proxy function called', () => {
        describe('when can not activate', () => {
          it('should throw exception when "tryActivate" returns false', async () => {
            sinon
              .stub(guardsConsumer, 'tryActivate')
              .callsFake(async () => false);
            let err: any;
            try {
              await proxyContext(1, 2, 3);
            } catch (e) {
              err = e;
            }
            expect(err).to.be.instanceOf(ForbiddenException);
          });
        });
        describe('when can activate', () => {
          it('should apply context and args', async () => {
            const args = [1, 2, 3];
            sinon
              .stub(guardsConsumer, 'tryActivate')
              .callsFake(async () => true);

            await proxyContext(...args);
            expect(applySpy.called).to.be.true;
          });
        });
      });
    });
  });
  describe('getContextModuleKey', () => {
    describe('when constructor is undefined', () => {
      it('should return empty string', () => {
        expect(contextCreator.getContextModuleKey(undefined)).to.be.eql('');
      });
    });
    describe('when module reference provider exists', () => {
      it('should return module key', () => {
        const modules = new Map();
        const moduleKey = 'key';

        const moduleRef = new Module(class {}, modules as any);
        modules.set(moduleKey, moduleRef);
        (contextCreator as any).modulesContainer = modules;

        sinon.stub(moduleRef, 'hasProvider').callsFake(() => true);

        expect(
          contextCreator.getContextModuleKey({ randomObject: true } as any),
        ).to.be.eql(moduleKey);
      });
    });
    describe('when provider does not exists', () => {
      it('should return empty string', () => {
        expect(contextCreator.getContextModuleKey({} as any)).to.be.eql('');
      });
    });
  });
  describe('exchangeKeysForValues', () => {
    it('should exchange arguments keys for appropriate values', () => {
      const metadata = {
        [RouteParamtypes.REQUEST]: { index: 0, data: 'test', pipes: [] },
        [RouteParamtypes.BODY]: { index: 2, data: 'test', pipes: [] },
        [`key${CUSTOM_ROUTE_ARGS_METADATA}`]: {
          index: 3,
          data: 'custom',
          pipes: [],
        },
      };
      const keys = Object.keys(metadata);
      const values = contextCreator.exchangeKeysForValues(
        keys,
        metadata,
        '',
        new RouteParamsFactory(),
      );
      const expectedValues = [
        { index: 0, type: RouteParamtypes.REQUEST, data: 'test' },
        { index: 2, type: RouteParamtypes.BODY, data: 'test' },
        { index: 3, type: `key${CUSTOM_ROUTE_ARGS_METADATA}`, data: 'custom' },
      ];
      expect(values[0]).to.deep.include(expectedValues[0]);
      expect(values[1]).to.deep.include(expectedValues[1]);
    });
  });
  describe('getParamValue', () => {
    let consumerApplySpy: sinon.SinonSpy;
    const value = 3,
      metatype = null,
      transforms = [{ transform: sinon.spy() }];

    beforeEach(() => {
      consumerApplySpy = sinon.spy(pipesConsumer, 'apply');
    });
    it('should call "consumer.apply"', () => {
      contextCreator.getParamValue(
        value,
        { metatype, type: RouteParamtypes.NEXT, data: null },
        transforms,
      );
      expect(consumerApplySpy.called).to.be.true;
    });
  });
  describe('createPipesFn', () => {
    describe('when "paramsOptions" is empty', () => {
      it('returns null', async () => {
        const pipesFn = contextCreator.createPipesFn([], []);
        expect(pipesFn).to.be.null;
      });
    });
    describe('when "paramsOptions" is not empty', () => {
      it('returns function', async () => {
        const pipesFn = contextCreator.createPipesFn(
          [],
          [
            {
              index: 1,
              type: 'test',
              data: null,
              pipes: [],
              extractValue: () => null,
            },
          ],
        );
        await pipesFn([]);
        expect(pipesFn).to.be.a('function');
      });
    });
  });

  describe('transformToResult', () => {
    describe('when resultOrDeferred', () => {
      describe('is Promise', () => {
        it('should return Promise', async () => {
          const value = 100;
          expect(
            await contextCreator.transformToResult(Promise.resolve(value)),
          ).to.be.eq(100);
        });
      });

      describe('is Observable', () => {
        it('should return Promise', async () => {
          const value = 100;
          expect(await contextCreator.transformToResult(of(value))).to.be.eq(
            100,
          );
        });
      });

      describe('is value', () => {
        it('should return Promise', async () => {
          const value = 100;
          expect(await contextCreator.transformToResult(value)).to.be.eq(100);
        });
      });
    });
  });
});
