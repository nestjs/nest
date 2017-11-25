import 'rxjs/add/observable/of';

import {expect} from 'chai';
import {Observable} from 'rxjs/Observable';
import * as sinon from 'sinon';

import {PARAMTYPES_METADATA} from '../../../common/constants';
import {ApplicationConfig} from '../../../core/application-config';
import {GuardsConsumer} from '../../../core/guards/guards-consumer';
import {
  GuardsContextCreator
} from '../../../core/guards/guards-context-creator';
import {NestContainer} from '../../../core/injector/container';
import {
  InterceptorsConsumer
} from '../../../core/interceptors/interceptors-consumer';
import {
  InterceptorsContextCreator
} from '../../../core/interceptors/interceptors-context-creator';
import {PipesConsumer} from '../../../core/pipes/pipes-consumer';
import {PipesContextCreator} from '../../../core/pipes/pipes-context-creator';
import {RpcExceptionsHandler} from '../../exceptions/rpc-exceptions-handler';
import {RpcException} from '../../index';

import {Component, Guard, Pipe, UseGuards, UsePipes} from './../../../common';
import {
  ExceptionFiltersContext
} from './../../context/exception-filters-context';
import {RpcContextCreator} from './../../context/rpc-context-creator';
import {RpcProxy} from './../../context/rpc-proxy';

@Guard()
class TestGuard {
  canActivate: () => true;
}

@Pipe()
class TestPipe {
  transform(val) { return val; }
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

  @UseGuards(TestGuard) @Component()
  class Test {
    @UsePipes(new TestPipe())
    test(data: string) { return Observable.of(false); }
  }

  beforeEach(() => {
    rpcProxy = new RpcProxy();
    exceptionFiltersContext =
        new ExceptionFiltersContext(new ApplicationConfig() as any);
    pipesCreator = new PipesContextCreator();
    pipesConsumer = new PipesConsumer();
    guardsContextCreator = new GuardsContextCreator(new NestContainer());
    guardsConsumer = new GuardsConsumer();
    contextCreator = new RpcContextCreator(
        rpcProxy,
        exceptionFiltersContext,
        pipesCreator as any,
        pipesConsumer as any,
        guardsContextCreator as any,
        guardsConsumer as any,
        new InterceptorsContextCreator(new NestContainer()) as any,
        new InterceptorsConsumer(),
    );

    instance = new Test();
    module = 'test';
  });
  describe('create', () => {
    it('should create exception handler', () => {
      const handlerCreateSpy = sinon.spy(exceptionFiltersContext, 'create');
      contextCreator.create(instance, instance.test, module);
      expect(handlerCreateSpy.calledWith(instance, instance.test)).to.be.true;
    });
    it('should create pipes context', () => {
      const pipesCreateSpy = sinon.spy(pipesCreator, 'create');
      contextCreator.create(instance, instance.test, module);
      expect(pipesCreateSpy.calledWith(instance, instance.test)).to.be.true;
    });
    it('should create guards context', () => {
      const guardsCreateSpy = sinon.spy(guardsContextCreator, 'create');
      contextCreator.create(instance, instance.test, module);
      expect(guardsCreateSpy.calledWith(instance, instance.test, module))
          .to.be.true;
    });
    describe('when proxy called', () => {
      it('should call guards consumer `tryActivate`', async () => {
        const tryActivateSpy = sinon.spy(guardsConsumer, 'tryActivate');
        const proxy =
            await contextCreator.create(instance, instance.test, module);
        const data = 'test';
        await proxy(data);

        expect(tryActivateSpy.called).to.be.true;
      });
      describe('when can activate', () => {
        it('should call pipes consumer `applyPipes`', async () => {
          const applyPipesSpy = sinon.spy(pipesConsumer, 'applyPipes');
          const proxy =
              await contextCreator.create(instance, instance.test, module);
          const data = 'test';
          await proxy(data);

          expect(applyPipesSpy.called).to.be.true;
        });
      });
      describe('when can not activate', () => {
        it('should throws forbidden exception', async () => {
          const tryActivateStub =
              sinon.stub(guardsConsumer, 'tryActivate').returns(false);
          const proxy =
              await contextCreator.create(instance, instance.test, module);
          const data = 'test';

          expect(proxy(data)).to.eventually.rejectedWith(RpcException);
        });
      });
    });
  });

  describe('reflectCallbackParamtypes', () => {
    it('should returns paramtypes array', () => {
      const paramtypes =
          contextCreator.reflectCallbackParamtypes(instance, instance.test);
      expect(paramtypes).to.be.eql([ String ]);
    });
  });

  describe('getDataMetatype', () => {
    describe('when paramtypes are reflected', () => {
      it('should returns data paramtype', () => {
        const type = contextCreator.getDataMetatype(instance, instance.test);
        expect(type).to.be.eql(String);
      });
    });
    describe('when paramtypes are not reflected', () => {
      it('should returns null', () => {
        const type = contextCreator.getDataMetatype(instance, () => ({}));
        expect(type).to.be.null;
      });
    });
  });
});