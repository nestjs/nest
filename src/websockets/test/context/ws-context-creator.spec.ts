import * as sinon from 'sinon';
import { expect } from 'chai';
import { Guard, Pipe, UseGuards, Component, UsePipes } from './../../../common';
import { WsProxy } from './../../context/ws-proxy';
import { WsContextCreator } from './../../context/ws-context-creator';
import { WsExceptionsHandler } from '../../exceptions/ws-exceptions-handler';
import { ExceptionFiltersContext } from './../../context/exception-filters-context';
import { PipesContextCreator } from '../../../core/pipes/pipes-context-creator';
import { PipesConsumer } from '../../../core/pipes/pipes-consumer';
import { PARAMTYPES_METADATA } from '../../../common/constants';
import { GuardsContextCreator } from '../../../core/guards/guards-context-creator';
import { GuardsConsumer } from '../../../core/guards/guards-consumer';
import { NestContainer } from '../../../core/injector/container';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import { WsException } from '../../index';
import { InterceptorsContextCreator } from '../../../core/interceptors/interceptors-context-creator';
import { InterceptorsConsumer } from '../../../core/interceptors/interceptors-consumer';

@Guard()
class TestGuard {
  canActivate: () => true;
}

@Pipe()
class TestPipe {
  transform(val) {
    return val;
  }
}

describe('WsContextCreator', () => {
  let contextCreator: WsContextCreator;
  let wsProxy: WsProxy;
  let exceptionFiltersContext: ExceptionFiltersContext;
  let pipesCreator: PipesContextCreator;
  let pipesConsumer: PipesConsumer;
  let guardsContextCreator: GuardsContextCreator;
  let guardsConsumer: GuardsConsumer;
  let instance: Test;
  let module: string;

  @UseGuards(TestGuard)
  @Component()
  class Test {
    @UsePipes(new TestPipe())
    test(client: string, data: number) {
      return Observable.of(false);
    }
  }

  beforeEach(() => {
    wsProxy = new WsProxy();
    exceptionFiltersContext = new ExceptionFiltersContext();
    pipesCreator = new PipesContextCreator();
    pipesConsumer = new PipesConsumer();
    guardsContextCreator = new GuardsContextCreator(new NestContainer());
    guardsConsumer = new GuardsConsumer();
    contextCreator = new WsContextCreator(
      wsProxy,
      exceptionFiltersContext,
      pipesCreator as any,
      pipesConsumer as any,
      guardsContextCreator as any,
      guardsConsumer as any,
      new InterceptorsContextCreator(new NestContainer()) as any,
      new InterceptorsConsumer()
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
      expect(guardsCreateSpy.calledWith(instance, instance.test, module)).to.be
        .true;
    });
    describe('when proxy called', () => {
      it('should call guards consumer `tryActivate`', async () => {
        const tryActivateSpy = sinon.spy(guardsConsumer, 'tryActivate');
        const proxy = await contextCreator.create(
          instance,
          instance.test,
          module
        );
        const data = 'test';
        await proxy(null, data);

        expect(tryActivateSpy.called).to.be.true;
      });
      describe('when can activate', () => {
        it('should call pipes consumer `applyPipes`', async () => {
          const applyPipesSpy = sinon.spy(pipesConsumer, 'applyPipes');
          const proxy = await contextCreator.create(
            instance,
            instance.test,
            module
          );
          const data = 'test';
          await proxy(null, data);

          expect(applyPipesSpy.called).to.be.true;
        });
      });
      describe('when can not activate', () => {
        it('should throws forbidden exception', async () => {
          const tryActivateStub = sinon
            .stub(guardsConsumer, 'tryActivate')
            .returns(false);
          const proxy = await contextCreator.create(
            instance,
            instance.test,
            module
          );
          const data = 'test';

          expect(proxy(null, data)).to.eventually.rejectedWith(WsException);
        });
      });
    });
  });

  describe('reflectCallbackParamtypes', () => {
    it('should returns paramtypes array', () => {
      const paramtypes = contextCreator.reflectCallbackParamtypes(
        instance,
        instance.test
      );
      expect(paramtypes).to.be.eql([String, Number]);
    });
  });

  describe('getDataMetatype', () => {
    describe('when paramtypes are reflected', () => {
      it('should returns data paramtype', () => {
        const type = contextCreator.getDataMetatype(instance, instance.test);
        expect(type).to.be.eql(Number);
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
