import { CUSTOM_ROUTE_AGRS_METADATA } from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { expect } from 'chai';
import { of } from 'rxjs';
import * as sinon from 'sinon';
import { ExternalExceptionFilterContext } from '../../exceptions/external-exception-filter-context';
import { GuardsConsumer } from '../../guards/guards-consumer';
import { GuardsContextCreator } from '../../guards/guards-context-creator';
import { ExternalContextCreator } from '../../helpers/external-context-creator';
import { NestContainer } from '../../injector/container';
import { ModulesContainer } from '../../injector/modules-container';
import { InterceptorsConsumer } from '../../interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '../../interceptors/interceptors-context-creator';
import { PipesConsumer } from '../../pipes/pipes-consumer';
import { PipesContextCreator } from '../../pipes/pipes-context-creator';
import { RouteParamsFactory } from '../../router/route-params-factory';

describe('ExternalContextCreator', () => {
  let contextCreator: ExternalContextCreator;
  let callback;
  let applySpy: sinon.SinonSpy;
  let bindSpy: sinon.SinonSpy;
  let guardsConsumer: GuardsConsumer;
  let consumer: PipesConsumer;

  beforeEach(() => {
    callback = {
      bind: () => ({}),
      apply: () => ({}),
    };
    bindSpy = sinon.spy(callback, 'bind');
    applySpy = sinon.spy(callback, 'apply');

    guardsConsumer = new GuardsConsumer();
    consumer = new PipesConsumer();
    contextCreator = new ExternalContextCreator(
      new GuardsContextCreator(new NestContainer()),
      guardsConsumer,
      new InterceptorsContextCreator(new NestContainer()),
      new InterceptorsConsumer(),
      new ModulesContainer(),
      new PipesContextCreator(new NestContainer()),
      consumer,
      new ExternalExceptionFilterContext(new NestContainer()),
    );
  });
  describe('create', () => {
    it('should call "findContextModuleName" with expected argument', done => {
      const findContextModuleNameSpy = sinon.spy(
        contextCreator,
        'findContextModuleName',
      );
      contextCreator.create({ foo: 'bar' }, callback as any, '', '', null);
      expect(findContextModuleNameSpy.called).to.be.true;
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
          it('should throw exception when "tryActivate" returns false', () => {
            sinon
              .stub(guardsConsumer, 'tryActivate')
              .callsFake(async () => false);
            proxyContext(1, 2, 3).catch(err => expect(err).to.not.be.undefined);
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
  describe('findContextModuleName', () => {
    describe('when constructor name is undefined', () => {
      it('should return empty string', () => {
        expect(contextCreator.findContextModuleName({} as any)).to.be.eql('');
      });
    });
    describe('when provider exists', () => {
      it('should return module key', () => {
        const modules = new Map();
        const providerKey = 'test';
        const moduleKey = 'key';

        modules.set(moduleKey, {});
        (contextCreator as any).modulesContainer = modules;
        sinon
          .stub(contextCreator, 'findProviderByClassName')
          .callsFake(() => true);

        expect(
          contextCreator.findContextModuleName({ name: providerKey } as any),
        ).to.be.eql(moduleKey);
      });
    });
    describe('when provider does not exists', () => {
      it('should return empty string', () => {
        sinon
          .stub(contextCreator, 'findProviderByClassName')
          .callsFake(() => false);
        expect(contextCreator.findContextModuleName({} as any)).to.be.eql('');
      });
    });
  });
  describe('findProviderByClassName', () => {
    describe('when provider exists', () => {
      it('should return true', () => {
        const providers = new Map();
        const key = 'test';
        providers.set(key, key);

        expect(
          contextCreator.findProviderByClassName(
            {
              providers,
            } as any,
            key,
          ),
        ).to.be.true;
      });
    });
    describe('when provider does not exists', () => {
      it('should return false', () => {
        const providers = new Map();
        const key = 'test';
        expect(
          contextCreator.findProviderByClassName(
            {
              providers,
            } as any,
            key,
          ),
        ).to.be.false;
      });
    });
  });
  describe('exchangeKeysForValues', () => {
    const res = { body: 'res' };
    const req = { body: { test: 'req' } };
    const next = () => {};

    it('should exchange arguments keys for appropriate values', () => {
      const metadata = {
        [RouteParamtypes.REQUEST]: { index: 0, data: 'test', pipes: [] },
        [RouteParamtypes.BODY]: { index: 2, data: 'test', pipes: [] },
        [`key${CUSTOM_ROUTE_AGRS_METADATA}`]: {
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
        { index: 3, type: `key${CUSTOM_ROUTE_AGRS_METADATA}`, data: 'custom' },
      ];
      expect(values[0]).to.deep.include(expectedValues[0]);
      expect(values[1]).to.deep.include(expectedValues[1]);
    });
  });
  describe('getCustomFactory', () => {
    describe('when factory is function', () => {
      it('should return curried factory', () => {
        const data = 3;
        const result = 10;
        const customFactory = (_, req) => result;

        expect(
          contextCreator.getCustomFactory(customFactory, data)(),
        ).to.be.eql(result);
      });
    });
    describe('when factory is undefined / is not a function', () => {
      it('should return curried null identity', () => {
        const result = 10;
        const customFactory = undefined;
        expect(
          contextCreator.getCustomFactory(customFactory, undefined)(),
        ).to.be.eql(null);
      });
    });
  });
  describe('getParamValue', () => {
    let consumerApplySpy: sinon.SinonSpy;
    const value = 3,
      metatype = null,
      transforms = [{ transform: sinon.spy() }];

    beforeEach(() => {
      consumerApplySpy = sinon.spy(consumer, 'apply');
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
    describe('when resultOrDeffered', () => {
      describe('is Promise', () => {
        it('should returns Promise', async () => {
          const value = 100;
          expect(
            await contextCreator.transformToResult(Promise.resolve(value)),
          ).to.be.eq(100);
        });
      });

      describe('is Observable', () => {
        it('should returns Promise', async () => {
          const value = 100;
          expect(await contextCreator.transformToResult(of(value))).to.be.eq(
            100,
          );
        });
      });

      describe('is value', () => {
        it('should returns Promise', async () => {
          const value = 100;
          expect(await contextCreator.transformToResult(value)).to.be.eq(100);
        });
      });
    });
  });
});
