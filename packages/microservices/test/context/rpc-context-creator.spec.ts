import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { expect } from 'chai';
import { of } from 'rxjs';
import * as sinon from 'sinon';
import { Injectable, UseGuards, UsePipes } from '../../../common';
import { CUSTOM_ROUTE_ARGS_METADATA } from '../../../common/constants';
import { ApplicationConfig } from '../../../core/application-config';
import { GuardsConsumer } from '../../../core/guards/guards-consumer';
import { GuardsContextCreator } from '../../../core/guards/guards-context-creator';
import { NestContainer } from '../../../core/injector/container';
import { InterceptorsConsumer } from '../../../core/interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '../../../core/interceptors/interceptors-context-creator';
import { PipesConsumer } from '../../../core/pipes/pipes-consumer';
import { PipesContextCreator } from '../../../core/pipes/pipes-context-creator';
import { ExceptionFiltersContext } from '../../context/exception-filters-context';
import { RpcContextCreator } from '../../context/rpc-context-creator';
import { RpcProxy } from '../../context/rpc-proxy';
import { RpcParamtype } from '../../enums/rpc-paramtype.enum';
import { RpcParamsFactory } from '../../factories/rpc-params-factory';
import { RpcException } from '../../index';

@Injectable()
class TestGuard {
  canActivate: () => true;
}

@Injectable()
class TestPipe {
  transform(val) {
    return val;
  }
}

describe('RpcContextCreator', () => {
  let contextCreator: RpcContextCreator;
  let rpcProxy: RpcProxy;
  let exceptionFiltersContext: ExceptionFiltersContext;
  let pipesCreator: PipesContextCreator;
  let pipesConsumer: PipesConsumer;
  let guardsContextCreator: GuardsContextCreator;
  let guardsConsumer: GuardsConsumer;
  let instance: Test;
  let module: string;

  @UseGuards(TestGuard)
  @Injectable()
  class Test {
    @UsePipes(new TestPipe())
    test(data: string) {
      return of(false);
    }
  }

  beforeEach(() => {
    const container: any = new NestContainer();
    rpcProxy = new RpcProxy();
    exceptionFiltersContext = new ExceptionFiltersContext(
      container,
      new ApplicationConfig() as any,
    );
    sinon.stub(rpcProxy, 'create').callsFake(a => a);

    pipesCreator = new PipesContextCreator(container);
    pipesConsumer = new PipesConsumer();
    guardsContextCreator = new GuardsContextCreator(container);
    guardsConsumer = new GuardsConsumer();
    contextCreator = new RpcContextCreator(
      rpcProxy,
      exceptionFiltersContext,
      pipesCreator as any,
      pipesConsumer as any,
      guardsContextCreator as any,
      guardsConsumer as any,
      new InterceptorsContextCreator(container) as any,
      new InterceptorsConsumer() as any,
    );

    instance = new Test();
    module = 'test';
  });
  describe('create', () => {
    it('should create exception handler', () => {
      const handlerCreateSpy = sinon.spy(exceptionFiltersContext, 'create');
      contextCreator.create(instance, instance.test, module, 'test');
      expect(
        handlerCreateSpy.calledWith(instance, instance.test as any, module),
      ).to.be.true;
    });
    it('should create pipes context', () => {
      const pipesCreateSpy = sinon.spy(pipesCreator, 'create');
      contextCreator.create(instance, instance.test, module, 'test');
      expect(pipesCreateSpy.calledWith(instance, instance.test as any, module))
        .to.be.true;
    });
    it('should create guards context', () => {
      const guardsCreateSpy = sinon.spy(guardsContextCreator, 'create');
      contextCreator.create(instance, instance.test, module, 'test');
      expect(guardsCreateSpy.calledWith(instance, instance.test, module)).to.be
        .true;
    });
    describe('when proxy called', () => {
      it('should call guards consumer `tryActivate`', async () => {
        const tryActivateSpy = sinon.spy(guardsConsumer, 'tryActivate');
        sinon
          .stub(guardsContextCreator, 'create')
          .callsFake(() => [{ canActivate: () => true }]);
        const proxy = contextCreator.create(
          instance,
          instance.test,
          module,
          'test',
        );
        const data = 'test';
        await proxy(data);

        expect(tryActivateSpy.called).to.be.true;
      });
      describe('when can not activate', () => {
        it('should throw forbidden exception', async () => {
          sinon
            .stub(guardsConsumer, 'tryActivate')
            .callsFake(async () => false);

          const proxy = contextCreator.create(
            instance,
            instance.test,
            module,
            'test',
          );
          const data = 'test';

          proxy(null, data).catch(err =>
            expect(err).to.be.instanceOf(RpcException),
          );
        });
      });
    });
  });

  describe('reflectCallbackParamtypes', () => {
    it('should return paramtypes array', () => {
      const paramtypes = contextCreator.reflectCallbackParamtypes(
        instance,
        instance.test,
      );
      expect(paramtypes).to.be.eql([String]);
    });
  });

  describe('createGuardsFn', () => {
    it('should throw exception when "tryActivate" returns false', () => {
      const guardsFn = contextCreator.createGuardsFn([null], null!, null!)!;
      sinon.stub(guardsConsumer, 'tryActivate').callsFake(async () => false);
      guardsFn([]).catch(err => expect(err).to.not.be.undefined);
    });
  });

  describe('exchangeKeysForValues', () => {
    it('should exchange arguments keys for appropriate values', () => {
      const metadata = {
        [RpcParamtype.PAYLOAD]: { index: 0, data: 'test', pipes: [] },
        [RpcParamtype.CONTEXT]: { index: 2, data: 'test', pipes: [] },
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
        new RpcParamsFactory(),
        (args: unknown[]) => new ExecutionContextHost(args),
      );
      const expectedValues = [
        { index: 0, type: RpcParamtype.PAYLOAD, data: 'test' },
        { index: 2, type: RpcParamtype.CONTEXT, data: 'test' },
        { index: 3, type: `key${CUSTOM_ROUTE_ARGS_METADATA}`, data: 'custom' },
      ];
      expect(values[0]).to.deep.include(expectedValues[0]);
      expect(values[1]).to.deep.include(expectedValues[1]);
      expect(values[2]).to.deep.include(expectedValues[2]);
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
    it('should call "consumer.apply"', async () => {
      await contextCreator.getParamValue(
        value,
        { metatype, type: RpcParamtype.PAYLOAD, data: null },
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
              data: null!,
              pipes: [],
              extractValue: () => null,
            },
          ],
        )!;
        await pipesFn([]);
        expect(pipesFn).to.be.a('function');
      });
    });
  });
});
