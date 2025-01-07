import { InjectionToken, Provider, Scope } from '@nestjs/common';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { setTimeout } from 'timers/promises';
import { ContextIdFactory } from '../helpers/context-id-factory';
import { NestContainer } from '../injector/container';
import { Injector } from '../injector/injector';
import { InstanceLoader } from '../injector/instance-loader';
import { GraphInspector } from '../inspector/graph-inspector';
import { NestApplicationContext } from '../nest-application-context';

describe('NestApplicationContext', () => {
  class A {}

  async function testHelper(
    injectionKey: InjectionToken,
    scope: Scope,
    additionalProviders: Array<Provider> = [],
  ): Promise<NestApplicationContext> {
    const nestContainer = new NestContainer();
    const injector = new Injector();
    const instanceLoader = new InstanceLoader(
      nestContainer,
      injector,
      new GraphInspector(nestContainer),
    );
    const { moduleRef } = (await nestContainer.addModule(class T {}, []))!;

    nestContainer.addProvider(
      {
        provide: injectionKey,
        useClass: A,
        scope,
      },
      moduleRef.token,
    );

    for (const provider of additionalProviders) {
      nestContainer.addProvider(provider, moduleRef.token);
    }

    nestContainer.addInjectable(
      {
        provide: injectionKey,
        useClass: A,
        scope,
      },
      moduleRef.token,
      'interceptor',
    );

    const modules = nestContainer.getModules();
    await instanceLoader.createInstancesOfDependencies(modules);

    const applicationContext = new NestApplicationContext(nestContainer);
    return applicationContext;
  }

  describe('listenToShutdownSignals', () => {
    it('shutdown process should not be interrupted by another handler', async () => {
      const signal = 'SIGTERM';
      let processUp = true;
      let promisesResolved = false;
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      applicationContext.enableShutdownHooks([signal]);

      const waitProcessDown = new Promise(resolve => {
        const shutdownCleanupRef = applicationContext['shutdownCleanupRef'];
        const handler = () => {
          if (
            !process
              .listeners(signal)
              .find(handler => handler == shutdownCleanupRef)
          ) {
            processUp = false;
            process.removeListener(signal, handler);
            resolve(undefined);
          }
          return undefined;
        };
        process.on(signal, handler);
      });

      // add some third party handler
      process.on(signal, signal => {
        // do some work
        process.kill(process.pid, signal);
      });

      const hookStub = sinon
        .stub(applicationContext as any, 'callShutdownHook')
        .callsFake(async () => {
          // run some async code
          await new Promise(resolve => setImmediate(() => resolve(undefined)));
          if (processUp) {
            promisesResolved = true;
          }
        });
      process.kill(process.pid, signal);
      await waitProcessDown;
      hookStub.restore();
      expect(processUp).to.be.false;
      expect(promisesResolved).to.be.true;
    });

    it('should defer shutdown until all init hooks are resolved', async () => {
      const clock = sinon.useFakeTimers({
        toFake: ['setTimeout'],
      });
      const signal = 'SIGTERM';

      const onModuleInitStub = sinon.stub();
      const onApplicationShutdownStub = sinon.stub();

      class B {
        async onModuleInit() {
          await setTimeout(5000);
          onModuleInitStub();
        }

        async onApplicationShutdown() {
          await setTimeout(1000);
          onApplicationShutdownStub();
        }
      }

      const applicationContext = await testHelper(A, Scope.DEFAULT, [
        { provide: B, useClass: B, scope: Scope.DEFAULT },
      ]);
      applicationContext.enableShutdownHooks([signal]);

      const ignoreProcessSignal = () => {
        // noop to prevent process from exiting
      };
      process.on(signal, ignoreProcessSignal);

      const deferredShutdown = async () => {
        await setTimeout(1);
        process.kill(process.pid, signal);
      };
      void Promise.all([applicationContext.init(), deferredShutdown()]);

      await clock.nextAsync();
      expect(onModuleInitStub.called).to.be.false;
      expect(onApplicationShutdownStub.called).to.be.false;

      await clock.nextAsync();
      expect(onModuleInitStub.called).to.be.true;
      expect(onApplicationShutdownStub.called).to.be.false;

      await clock.nextAsync();
      expect(onModuleInitStub.called).to.be.true;
      expect(onApplicationShutdownStub.called).to.be.true;

      clock.restore();
    });
  });

  describe('get', () => {
    describe('when scope = DEFAULT', () => {
      it('should get value with function injection key', async () => {
        const key = A;
        const applicationContext = await testHelper(key, Scope.DEFAULT);

        const a1: A = await applicationContext.get(key);
        const a2: A = await applicationContext.get(key);

        expect(a1).instanceOf(A);
        expect(a2).instanceOf(A);
        expect(a1).equal(a2);
      });

      it('should get value with string injection key', async () => {
        const key = 'KEY_A';
        const applicationContext = await testHelper(key, Scope.DEFAULT);

        const a1: A = await applicationContext.get(key);
        const a2: A = await applicationContext.get(key);

        expect(a1).instanceOf(A);
        expect(a2).instanceOf(A);
        expect(a1).equal(a2);
      });

      it('should get value with symbol injection key', async () => {
        const key = Symbol('KEY_A');
        const applicationContext = await testHelper(key, Scope.DEFAULT);

        const a1: A = await applicationContext.get(key);
        const a2: A = await applicationContext.get(key);

        expect(a1).instanceOf(A);
        expect(a2).instanceOf(A);
        expect(a1).equal(a2);
      });
    });

    describe('when scope = REQUEST', () => {
      it('should throw error when use function injection key', async () => {
        const key = A;
        const applicationContext = await testHelper(key, Scope.REQUEST);

        expect(() => applicationContext.get(key)).to.be.throw;
      });

      it('should throw error when use string injection key', async () => {
        const key = 'KEY_A';
        const applicationContext = await testHelper(key, Scope.REQUEST);

        expect(() => applicationContext.get(key)).to.be.throw;
      });

      it('should throw error when use symbol injection key', async () => {
        const key = Symbol('KEY_A');
        const applicationContext = await testHelper(key, Scope.REQUEST);

        expect(() => applicationContext.get(key)).to.be.throw;
      });
    });

    describe('when scope = TRANSIENT', () => {
      it('should throw error when use function injection key', async () => {
        const key = A;
        const applicationContext = await testHelper(key, Scope.TRANSIENT);

        expect(() => applicationContext.get(key)).to.be.throw;
      });

      it('should throw error when use string injection key', async () => {
        const key = 'KEY_A';
        const applicationContext = await testHelper(key, Scope.TRANSIENT);

        expect(() => applicationContext.get(key)).to.be.throw;
      });

      it('should throw error when use symbol injection key', async () => {
        const key = Symbol('KEY_A');
        const applicationContext = await testHelper(key, Scope.TRANSIENT);

        expect(() => applicationContext.get(key)).to.be.throw;
      });
    });
  });

  describe('resolve', () => {
    describe('when scope = DEFAULT', () => {
      it('should resolve value with function injection key', async () => {
        const key = A;
        const applicationContext = await testHelper(key, Scope.DEFAULT);

        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key);

        expect(a1).instanceOf(A);
        expect(a2).instanceOf(A);
        expect(a1).equal(a2);
      });

      it('should resolve value with string injection key', async () => {
        const key = 'KEY_A';
        const applicationContext = await testHelper(key, Scope.DEFAULT);

        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key);

        expect(a1).instanceOf(A);
        expect(a2).instanceOf(A);
        expect(a1).equal(a2);
      });

      it('should resolve value with symbol injection key', async () => {
        const key = Symbol('KEY_A');
        const applicationContext = await testHelper(key, Scope.DEFAULT);

        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key);

        expect(a1).instanceOf(A);
        expect(a2).instanceOf(A);
        expect(a1).equal(a2);
      });
    });

    describe('when scope = REQUEST', () => {
      it('should resolve value with function injection key', async () => {
        const key = A;
        const applicationContext = await testHelper(key, Scope.REQUEST);

        const contextId = ContextIdFactory.create();
        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key, contextId);
        const a3: A = await applicationContext.resolve(key, contextId);

        expect(a1).instanceOf(A);
        expect(a2).instanceOf(A);
        expect(a1).not.equal(a2);
        expect(a2).equal(a3);
      });

      it('should resolve value with string injection key', async () => {
        const key = 'KEY_A';
        const applicationContext = await testHelper(key, Scope.REQUEST);

        const contextId = ContextIdFactory.create();
        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key, contextId);
        const a3: A = await applicationContext.resolve(key, contextId);

        expect(a1).instanceOf(A);
        expect(a2).instanceOf(A);
        expect(a1).not.equal(a2);
        expect(a2).equal(a3);
      });

      it('should resolve value with symbol injection key', async () => {
        const key = Symbol('KEY_A');
        const applicationContext = await testHelper(key, Scope.REQUEST);

        const contextId = ContextIdFactory.create();
        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key, contextId);
        const a3: A = await applicationContext.resolve(key, contextId);

        expect(a1).instanceOf(A);
        expect(a2).instanceOf(A);
        expect(a1).not.equal(a2);
        expect(a2).equal(a3);
      });
    });

    describe('when scope = TRANSIENT', () => {
      it('should resolve value with function injection key', async () => {
        const key = A;
        const applicationContext = await testHelper(key, Scope.TRANSIENT);

        const contextId = ContextIdFactory.create();
        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key, contextId);
        const a3: A = await applicationContext.resolve(key, contextId);

        expect(a1).instanceOf(A);
        expect(a2).instanceOf(A);
        expect(a1).not.equal(a2);
        expect(a2).equal(a3);
      });

      it('should resolve value with string injection key', async () => {
        const key = 'KEY_A';
        const applicationContext = await testHelper(key, Scope.TRANSIENT);

        const contextId = ContextIdFactory.create();
        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key, contextId);
        const a3: A = await applicationContext.resolve(key, contextId);

        expect(a1).instanceOf(A);
        expect(a2).instanceOf(A);
        expect(a1).not.equal(a2);
        expect(a2).equal(a3);
      });

      it('should resolve value with symbol injection key', async () => {
        const key = Symbol('KEY_A');
        const applicationContext = await testHelper(key, Scope.TRANSIENT);

        const contextId = ContextIdFactory.create();
        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key, contextId);
        const a3: A = await applicationContext.resolve(key, contextId);

        expect(a1).instanceOf(A);
        expect(a2).instanceOf(A);
        expect(a1).not.equal(a2);
        expect(a2).equal(a3);
      });
    });
  });
});
