import { expect } from 'chai';
import * as sinon from 'sinon';
import { RouteParamsMetadata } from '../../../common';
import { CUSTOM_ROUTE_AGRS_METADATA } from '../../../common/constants';
import { RouteParamtypes } from '../../../common/enums/route-paramtypes.enum';
import { AbstractHttpAdapter } from '../../adapters';
import { ApplicationConfig } from '../../application-config';
import { GuardsConsumer } from '../../guards/guards-consumer';
import { GuardsContextCreator } from '../../guards/guards-context-creator';
import { NestContainer } from '../../injector/container';
import { InterceptorsConsumer } from '../../interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '../../interceptors/interceptors-context-creator';
import { PipesConsumer } from '../../pipes/pipes-consumer';
import { PipesContextCreator } from '../../pipes/pipes-context-creator';
import { RouteParamsFactory } from '../../router/route-params-factory';
import { RouterExecutionContext } from '../../router/router-execution-context';
import { NoopHttpAdapter } from '../utils/noop-adapter.spec';

describe('RouterExecutionContext', () => {
  let contextCreator: RouterExecutionContext;
  let callback;
  let applySpy: sinon.SinonSpy;
  let bindSpy: sinon.SinonSpy;
  let factory: RouteParamsFactory;
  let consumer: PipesConsumer;
  let guardsConsumer: GuardsConsumer;
  let adapter: AbstractHttpAdapter;

  beforeEach(() => {
    callback = {
      bind: () => ({}),
      apply: () => ({}),
    };
    bindSpy = sinon.spy(callback, 'bind');
    applySpy = sinon.spy(callback, 'apply');

    factory = new RouteParamsFactory();
    consumer = new PipesConsumer();
    guardsConsumer = new GuardsConsumer();

    adapter = new NoopHttpAdapter({});
    contextCreator = new RouterExecutionContext(
      factory,
      new PipesContextCreator(new NestContainer(), new ApplicationConfig()),
      consumer,
      new GuardsContextCreator(new NestContainer()),
      guardsConsumer,
      new InterceptorsContextCreator(new NestContainer()),
      new InterceptorsConsumer(),
      adapter,
    );
  });
  describe('create', () => {
    describe('when callback metadata is not undefined', () => {
      let metadata: RouteParamsMetadata;
      let exchangeKeysForValuesSpy: sinon.SinonSpy;
      beforeEach(() => {
        metadata = {
          [RouteParamtypes.NEXT]: { index: 0 },
          [RouteParamtypes.BODY]: {
            index: 2,
            data: 'test',
          },
        };
        sinon
          .stub((contextCreator as any).contextUtils, 'reflectCallbackMetadata')
          .returns(metadata);
        sinon
          .stub(
            (contextCreator as any).contextUtils,
            'reflectCallbackParamtypes',
          )
          .returns([]);
        exchangeKeysForValuesSpy = sinon.spy(
          contextCreator,
          'exchangeKeysForValues',
        );
      });
      it('should call "exchangeKeysForValues" with expected arguments', done => {
        const keys = Object.keys(metadata);

        contextCreator.create({ foo: 'bar' }, callback as any, '', '', 0);
        expect(exchangeKeysForValuesSpy.called).to.be.true;
        expect(exchangeKeysForValuesSpy.calledWith(keys, metadata)).to.be.true;
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
            0,
          );
        });
        it('should be a function', () => {
          expect(proxyContext).to.be.a('function');
        });
        describe('when proxy function called', () => {
          let request;
          const response = {
            status: () => response,
            send: () => response,
            json: () => response,
          };
          const next = {};

          beforeEach(() => {
            request = {
              body: {
                test: 3,
              },
            };
          });
          it('should apply expected context and arguments to callback', done => {
            proxyContext(request, response, next).then(() => {
              const args = [next, undefined, request.body.test];
              expect(applySpy.called).to.be.true;
              expect(applySpy.calledWith(instance, args)).to.be.true;
              done();
            });
          });
          it('should throw exception when "tryActivate" returns false', () => {
            sinon.stub(guardsConsumer, 'tryActivate').callsFake(() => false);
            proxyContext(request, response, next).catch(
              error => expect(error).to.not.be.undefined,
            );
          });
        });
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
      const values = contextCreator.exchangeKeysForValues(keys, metadata, '');
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
      transforms = [];

    beforeEach(() => {
      consumerApplySpy = sinon.spy(consumer, 'apply');
    });
    describe('when paramtype is query, body or param', () => {
      it('should call "consumer.apply" with expected arguments', () => {
        contextCreator.getParamValue(
          value,
          { metatype, type: RouteParamtypes.QUERY, data: null },
          transforms,
        );
        expect(
          consumerApplySpy.calledWith(
            value,
            { metatype, type: RouteParamtypes.QUERY, data: null },
            transforms,
          ),
        ).to.be.true;

        contextCreator.getParamValue(
          value,
          { metatype, type: RouteParamtypes.BODY, data: null },
          transforms,
        );
        expect(
          consumerApplySpy.calledWith(
            value,
            { metatype, type: RouteParamtypes.BODY, data: null },
            transforms,
          ),
        ).to.be.true;

        contextCreator.getParamValue(
          value,
          { metatype, type: RouteParamtypes.PARAM, data: null },
          transforms,
        );
        expect(
          consumerApplySpy.calledWith(
            value,
            { metatype, type: RouteParamtypes.PARAM, data: null },
            transforms,
          ),
        ).to.be.true;
      });
    });
    describe('when paramtype is not query, body and param', () => {
      it('should not call "consumer.apply"', () => {
        contextCreator.getParamValue(
          value,
          { metatype, type: RouteParamtypes.NEXT, data: null },
          transforms,
        );
        expect(consumerApplySpy.called).to.be.false;
      });
    });
  });
  describe('createPipesFn', () => {
    describe('when "paramsOptions" is empty', () => {
      it('returns null', async () => {
        const pipesFn = contextCreator.createPipesFn([], []);
        expect(pipesFn).to.be.null;
      });
    });
  });
  describe('createGuardsFn', () => {
    it('should throw exception when "tryActivate" returns false', () => {
      const guardsFn = contextCreator.createGuardsFn([null], null, null);
      sinon.stub(guardsConsumer, 'tryActivate').callsFake(() => false);
      guardsFn([]).catch(err => expect(err).to.not.be.undefined);
    });
  });
  describe('createHandleResponseFn', () => {
    describe('when "renderTemplate" is defined', () => {
      beforeEach(() => {
        sinon
          .stub(adapter, 'render')
          .callsFake((response, view: string, options: any) => {
            return response.render(view, options);
          });
      });
      it('should call "res.render()" with expected args', async () => {
        const template = 'template';
        const value = 'test';
        const response = { render: sinon.spy() };

        sinon.stub(contextCreator, 'reflectResponseHeaders').returns([]);
        sinon.stub(contextCreator, 'reflectRenderTemplate').returns(template);

        const handler = contextCreator.createHandleResponseFn(null, true, 100);
        await handler(value, response);

        expect(response.render.calledWith(template, value)).to.be.true;
      });
    });
    describe('when "renderTemplate" is undefined', () => {
      it('should not call "res.render()"', () => {
        const result = Promise.resolve('test');
        const response = { render: sinon.spy() };

        sinon.stub(contextCreator, 'reflectResponseHeaders').returns([]);
        sinon.stub(contextCreator, 'reflectRenderTemplate').returns(undefined);

        const handler = contextCreator.createHandleResponseFn(null, true, 100);
        handler(result, response);

        expect(response.render.called).to.be.false;
      });
    });
  });
});
