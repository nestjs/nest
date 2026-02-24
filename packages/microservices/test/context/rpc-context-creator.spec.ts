import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { expect } from 'chai';
import { Observable, of } from 'rxjs';
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

  describe('preRequest hooks', () => {
    function makeCreatorWithHooks(hooks: any[]) {
      const container: any = new NestContainer();
      const localRpcProxy = new RpcProxy();
      const localExceptionFiltersContext = new ExceptionFiltersContext(
        container,
        new ApplicationConfig() as any,
      );
      sinon.stub(localRpcProxy, 'create').callsFake(a => a);

      const mockConfig = {
        getGlobalPreRequestHooks: () => hooks,
      } as any;

      return new RpcContextCreator(
        localRpcProxy,
        localExceptionFiltersContext,
        new PipesContextCreator(container) as any,
        new PipesConsumer() as any,
        new GuardsContextCreator(container) as any,
        new GuardsConsumer() as any,
        new InterceptorsContextCreator(container) as any,
        new InterceptorsConsumer() as any,
        mockConfig,
      );
    }

    it('should execute preRequest hook before guards', async () => {
      const executionOrder: string[] = [];

      const hookFn = (_ctx: any, next: () => Observable<unknown>) => {
        executionOrder.push('hook');
        return next();
      };

      const creator = makeCreatorWithHooks([hookFn]);
      sinon
        .stub(new GuardsContextCreator(new NestContainer() as any), 'create')
        .returns([]);

      const localGuardsConsumer = new GuardsConsumer();
      sinon.stub(localGuardsConsumer, 'tryActivate').callsFake(async () => {
        executionOrder.push('guard');
        return true;
      });

      const container: any = new NestContainer();
      const localRpcProxy = new RpcProxy();
      const localExceptionFiltersContext = new ExceptionFiltersContext(
        container,
        new ApplicationConfig() as any,
      );
      sinon.stub(localRpcProxy, 'create').callsFake(a => a);
      const mockConfig = { getGlobalPreRequestHooks: () => [hookFn] } as any;
      const localGuardsContextCreator = new GuardsContextCreator(container);
      sinon.stub(localGuardsContextCreator, 'create').returns([
        {
          canActivate: () => {
            executionOrder.push('guard');
            return true;
          },
        },
      ]);

      const hookCreator = new RpcContextCreator(
        localRpcProxy,
        localExceptionFiltersContext,
        new PipesContextCreator(container) as any,
        new PipesConsumer() as any,
        localGuardsContextCreator as any,
        new GuardsConsumer() as any,
        new InterceptorsContextCreator(container) as any,
        new InterceptorsConsumer() as any,
        mockConfig,
      );

      const proxy = hookCreator.create(instance, instance.test, module, 'test');
      const result = await proxy('data');
      if (result && typeof (result as any).subscribe === 'function') {
        await new Promise<void>(resolve => {
          (result as Observable<unknown>).subscribe({
            complete: resolve,
            error: resolve,
          });
        });
      }

      expect(executionOrder[0]).to.equal('hook');
      expect(executionOrder[1]).to.equal('guard');
    });

    it('should chain multiple hooks in registration order', async () => {
      const order: string[] = [];

      const hook1 = (_ctx: any, next: () => Observable<unknown>) => {
        order.push('hook1');
        return next();
      };
      const hook2 = (_ctx: any, next: () => Observable<unknown>) => {
        order.push('hook2');
        return next();
      };

      const container: any = new NestContainer();
      const localRpcProxy = new RpcProxy();
      sinon.stub(localRpcProxy, 'create').callsFake(a => a);
      const mockConfig = {
        getGlobalPreRequestHooks: () => [hook1, hook2],
      } as any;
      const localGuardsContextCreator = new GuardsContextCreator(container);
      sinon.stub(localGuardsContextCreator, 'create').returns([
        {
          canActivate: () => {
            order.push('guard');
            return true;
          },
        },
      ]);

      const hookCreator = new RpcContextCreator(
        localRpcProxy,
        new ExceptionFiltersContext(container, new ApplicationConfig() as any),
        new PipesContextCreator(container) as any,
        new PipesConsumer() as any,
        localGuardsContextCreator as any,
        new GuardsConsumer() as any,
        new InterceptorsContextCreator(container) as any,
        new InterceptorsConsumer() as any,
        mockConfig,
      );

      const proxy = hookCreator.create(instance, instance.test, module, 'test');
      const result = await proxy('data');
      if (result && typeof (result as any).subscribe === 'function') {
        await new Promise<void>(resolve => {
          (result as Observable<unknown>).subscribe({
            complete: resolve,
            error: resolve,
          });
        });
      }

      expect(order).to.deep.equal(['hook1', 'hook2', 'guard']);
    });

    it('should not call hook when no hooks are registered (fast-path)', async () => {
      const hookFn = sinon.spy((_ctx: any, next: () => Observable<unknown>) =>
        next(),
      );
      const creator = makeCreatorWithHooks([]);

      const guardSpy = sinon.spy(guardsConsumer, 'tryActivate');
      sinon
        .stub(guardsContextCreator, 'create')
        .callsFake(() => [{ canActivate: () => true }]);

      contextCreator = new RpcContextCreator(
        rpcProxy,
        exceptionFiltersContext,
        pipesCreator as any,
        pipesConsumer as any,
        guardsContextCreator as any,
        guardsConsumer as any,
        new InterceptorsContextCreator(new NestContainer() as any) as any,
        new InterceptorsConsumer() as any,
        { getGlobalPreRequestHooks: () => [] } as any,
      );

      const proxy = contextCreator.create(
        instance,
        instance.test,
        module,
        'test',
      );
      await proxy('data');
      expect(hookFn.called).to.be.false;
      expect(guardSpy.called).to.be.true;
    });

    it('should provide ExecutionContext with getClass() and getHandler() to the hook', async () => {
      let capturedContext: any;

      const hookFn = (ctx: any, next: () => Observable<unknown>) => {
        capturedContext = ctx;
        return next();
      };

      const container: any = new NestContainer();
      const localRpcProxy = new RpcProxy();
      sinon.stub(localRpcProxy, 'create').callsFake(a => a);
      const mockConfig = { getGlobalPreRequestHooks: () => [hookFn] } as any;
      const localGuardsContextCreator = new GuardsContextCreator(container);
      sinon.stub(localGuardsContextCreator, 'create').returns([]);

      const hookCreator = new RpcContextCreator(
        localRpcProxy,
        new ExceptionFiltersContext(container, new ApplicationConfig() as any),
        new PipesContextCreator(container) as any,
        new PipesConsumer() as any,
        localGuardsContextCreator as any,
        new GuardsConsumer() as any,
        new InterceptorsContextCreator(container) as any,
        new InterceptorsConsumer() as any,
        mockConfig,
      );

      const proxy = hookCreator.create(instance, instance.test, module, 'test');
      const result = await proxy('data');
      if (result && typeof (result as any).subscribe === 'function') {
        await new Promise<void>(resolve => {
          (result as Observable<unknown>).subscribe({
            complete: resolve,
            error: resolve,
          });
        });
      }

      expect(capturedContext).to.not.be.undefined;
      expect(capturedContext.getClass()).to.equal(Test);
      expect(capturedContext.getHandler()).to.equal(instance.test);
      expect(capturedContext.getType()).to.equal('rpc');
    });

    it('should simulate ALS context available in guard (AsyncLocalStorage scenario)', async () => {
      const store = new Map<string, string>();
      let correlationIdInGuard: string | undefined;

      const hookFn = (ctx: any, next: () => Observable<unknown>) => {
        store.set('correlationId', 'test-id-123');
        return next();
      };

      const container: any = new NestContainer();
      const localRpcProxy = new RpcProxy();
      sinon.stub(localRpcProxy, 'create').callsFake(a => a);
      const mockConfig = { getGlobalPreRequestHooks: () => [hookFn] } as any;
      const localGuardsContextCreator = new GuardsContextCreator(container);
      sinon.stub(localGuardsContextCreator, 'create').returns([
        {
          canActivate: () => {
            correlationIdInGuard = store.get('correlationId');
            return true;
          },
        },
      ]);

      const hookCreator = new RpcContextCreator(
        localRpcProxy,
        new ExceptionFiltersContext(container, new ApplicationConfig() as any),
        new PipesContextCreator(container) as any,
        new PipesConsumer() as any,
        localGuardsContextCreator as any,
        new GuardsConsumer() as any,
        new InterceptorsContextCreator(container) as any,
        new InterceptorsConsumer() as any,
        mockConfig,
      );

      const proxy = hookCreator.create(instance, instance.test, module, 'test');
      const result = await proxy('data');
      if (result && typeof (result as any).subscribe === 'function') {
        await new Promise<void>(resolve => {
          (result as Observable<unknown>).subscribe({
            complete: resolve,
            error: resolve,
          });
        });
      }

      expect(correlationIdInGuard).to.equal('test-id-123');
    });
  });
});
