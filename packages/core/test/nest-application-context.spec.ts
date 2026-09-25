import {
  Injectable,
  InjectionToken,
  Logger,
  Provider,
  Scope,
} from '@nestjs/common';
import { MESSAGES } from '../constants.js';
import { ContextIdFactory } from '../helpers/context-id-factory.js';
import { NestContainer } from '../injector/container.js';
import { Injector } from '../injector/injector.js';
import { InstanceLoader } from '../injector/instance-loader.js';
import { GraphInspector } from '../inspector/graph-inspector.js';
import { NestApplicationContext } from '../nest-application-context.js';

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
    function removeListenersNotIn(
      signal: string,
      baseline: Set<ReturnType<typeof process.listeners>[number]>,
    ) {
      process.listeners(signal).forEach(listener => {
        if (!baseline.has(listener)) {
          process.removeListener(signal, listener);
        }
      });
    }

    it('shutdown process should not be interrupted by another handler', async () => {
      const signal = 'SIGTERM';
      let processUp = true;
      let promisesResolved = false;
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      applicationContext.enableShutdownHooks([signal]);

      const waitProcessDown = new Promise(resolve => {
        const shutdownCleanupRef =
          applicationContext['shutdownCleanupRefs'].get(signal);
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

      const hookStub = vi
        .spyOn(applicationContext as any, 'callShutdownHook')
        .mockImplementation(async () => {
          // run some async code
          await new Promise(resolve => setImmediate(() => resolve(undefined)));
          if (processUp) {
            promisesResolved = true;
          }
        });
      process.kill(process.pid, signal);
      await waitProcessDown;
      hookStub.mockRestore();
      expect(processUp).toBe(false);
      expect(promisesResolved).toBe(true);
    });

    it('should normalize signals before removing duplicates', async () => {
      const signal = 'SIGTERM';
      const listeners = new Set(process.listeners(signal));
      const applicationContext = await testHelper(A, Scope.DEFAULT);

      try {
        applicationContext.enableShutdownHooks(['sigterm', ' SIGTERM ']);

        expect(process.listenerCount(signal)).toBe(listeners.size + 1);

        await applicationContext.close();

        expect(process.listenerCount(signal)).toBe(listeners.size);
      } finally {
        removeListenersNotIn(signal, listeners);
      }
    });

    it('should remove the listener when the same signal is registered by separate calls', async () => {
      const signal = 'SIGTERM';
      const listeners = new Set(process.listeners(signal));
      const applicationContext = await testHelper(A, Scope.DEFAULT);

      try {
        applicationContext.enableShutdownHooks([signal]);
        applicationContext.enableShutdownHooks([signal]);

        expect(process.listenerCount(signal)).toBe(listeners.size + 1);

        await applicationContext.close();

        expect(process.listenerCount(signal)).toBe(listeners.size);
      } finally {
        removeListenersNotIn(signal, listeners);
      }
    });

    it('should allow shutdown hooks to be enabled after close', async () => {
      const signal = 'SIGTERM';
      const listeners = new Set(process.listeners(signal));
      const applicationContext = await testHelper(A, Scope.DEFAULT);

      try {
        applicationContext.enableShutdownHooks([signal]);
        expect(process.listenerCount(signal)).toBe(listeners.size + 1);

        await applicationContext.close();
        expect(process.listenerCount(signal)).toBe(listeners.size);

        applicationContext.enableShutdownHooks([signal]);

        expect(process.listenerCount(signal)).toBe(listeners.size + 1);

        await applicationContext.close();
        expect(process.listenerCount(signal)).toBe(listeners.size);
      } finally {
        removeListenersNotIn(signal, listeners);
      }
    });

    it('should run shutdown hooks once when a signal arrives during close', async () => {
      const signal = 'SIGTERM';
      const listeners = new Set(process.listeners(signal));
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      const processExitStub = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => ({}) as any);
      const processKillStub = vi
        .spyOn(process, 'kill')
        .mockImplementation(() => true);

      let releaseDestroyHook: () => void;
      const destroyHookCalled = new Promise<void>(resolve => {
        releaseDestroyHook = resolve;
      });
      const destroyHookStub = vi
        .spyOn(applicationContext as any, 'callDestroyHook')
        .mockImplementation(async () => {
          releaseDestroyHook();
          await new Promise(resolve => setTimeout(resolve, 10));
        });
      const hookStub = vi
        .spyOn(applicationContext as any, 'callShutdownHook')
        .mockImplementation(async () => undefined);

      try {
        applicationContext.enableShutdownHooks([signal]);
        const cleanup = applicationContext['shutdownCleanupRefs'].get(signal)!;

        // Start a programmatic close, then deliver a signal while the
        // destroy hook of that close is still in flight.
        const closing = applicationContext.close();
        await destroyHookCalled;
        await cleanup(signal);
        await closing;

        expect(destroyHookStub).toHaveBeenCalledTimes(1);
        expect(hookStub).toHaveBeenCalledTimes(1);
        expect(process.listenerCount(signal)).toBe(listeners.size);
      } finally {
        destroyHookStub.mockRestore();
        hookStub.mockRestore();
        processKillStub.mockRestore();
        processExitStub.mockRestore();
        removeListenersNotIn(signal, listeners);
      }
    });

    it('should not get stuck when the shutdown sequence throws', async () => {
      const signal = 'SIGTERM';
      const listeners = new Set(process.listeners(signal));
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      const processExitStub = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => ({}) as any);
      const processKillStub = vi
        .spyOn(process, 'kill')
        .mockImplementation(() => true);
      const hookStub = vi
        .spyOn(applicationContext as any, 'callShutdownHook')
        .mockRejectedValueOnce(new Error('shutdown hook failed'))
        .mockImplementation(async () => undefined);

      try {
        applicationContext.enableShutdownHooks([signal]);
        await applicationContext['shutdownCleanupRefs'].get(signal)!(signal);

        expect(processExitStub).toHaveBeenCalledWith(1);

        // The failed cycle must not latch the guard: closing the context
        // afterwards still runs the shutdown sequence.
        await applicationContext.close();

        expect(hookStub).toHaveBeenCalledTimes(2);
        expect(process.listenerCount(signal)).toBe(listeners.size);
      } finally {
        hookStub.mockRestore();
        processKillStub.mockRestore();
        processExitStub.mockRestore();
        removeListenersNotIn(signal, listeners);
      }
    });

    it('should allow shutdown hooks to run after being re-enabled', async () => {
      const signal = 'SIGTERM';
      const listeners = new Set(process.listeners(signal));
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      const processExitStub = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => ({}) as any);
      const processKillStub = vi
        .spyOn(process, 'kill')
        .mockImplementation(() => true);
      const hookStub = vi
        .spyOn(applicationContext as any, 'callShutdownHook')
        .mockImplementation(async () => undefined);

      try {
        applicationContext.enableShutdownHooks([signal]);
        await applicationContext['shutdownCleanupRefs'].get(signal)!(signal);

        applicationContext.enableShutdownHooks([signal]);
        await applicationContext['shutdownCleanupRefs'].get(signal)!(signal);

        expect(hookStub).toHaveBeenCalledTimes(2);
        expect(processKillStub).toHaveBeenCalledTimes(2);
      } finally {
        hookStub.mockRestore();
        processKillStub.mockRestore();
        processExitStub.mockRestore();
        removeListenersNotIn(signal, listeners);
      }
    });

    it('should remove signal listeners registered by separate calls', async () => {
      const signals = ['SIGTERM', 'SIGINT'];
      const listeners = signals.map(
        signal => new Set(process.listeners(signal)),
      );
      const applicationContext = await testHelper(A, Scope.DEFAULT);

      try {
        applicationContext.enableShutdownHooks([signals[0]]);
        applicationContext.enableShutdownHooks([signals[1]]);

        signals.forEach((signal, index) => {
          expect(process.listenerCount(signal)).toBe(listeners[index].size + 1);
        });

        await applicationContext.close();

        signals.forEach((signal, index) => {
          expect(process.listenerCount(signal)).toBe(listeners[index].size);
        });
      } finally {
        signals.forEach((signal, index) => {
          removeListenersNotIn(signal, listeners[index]);
        });
      }
    });

    it('should run shutdown hooks once across separate registrations', async () => {
      const signals = ['SIGTERM', 'SIGINT'];
      const listeners = signals.map(
        signal => new Set(process.listeners(signal)),
      );
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      const processExitStub = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => ({}) as any);
      const processKillStub = vi
        .spyOn(process, 'kill')
        .mockImplementation(() => true);
      const hookStub = vi
        .spyOn(applicationContext as any, 'callShutdownHook')
        .mockImplementation(async () => undefined);

      try {
        applicationContext.enableShutdownHooks([signals[0]]);
        applicationContext.enableShutdownHooks([signals[1]]);

        signals.forEach((signal, index) => {
          expect(process.listenerCount(signal)).toBe(listeners[index].size + 1);
        });

        const cleanupHandlers = signals.map(signal =>
          applicationContext['shutdownCleanupRefs'].get(signal),
        );

        await Promise.all([
          cleanupHandlers[0]!(signals[0]),
          cleanupHandlers[1]!(signals[1]),
        ]);

        expect(hookStub).toHaveBeenCalledTimes(1);
        expect(processKillStub).toHaveBeenCalledTimes(1);
        signals.forEach((signal, index) => {
          expect(process.listenerCount(signal)).toBe(listeners[index].size);
        });
      } finally {
        hookStub.mockRestore();
        processKillStub.mockRestore();
        processExitStub.mockRestore();
        signals.forEach((signal, index) => {
          removeListenersNotIn(signal, listeners[index]);
        });
      }
    });

    it('should defer shutdown until all init hooks are resolved', async () => {
      const clock = vi.useFakeTimers({
        toFake: ['setTimeout'],
      });
      const signal = 'SIGTERM';

      const onModuleInitStub = vi.fn();
      const onApplicationShutdownStub = vi.fn();

      // Use global setTimeout wrapped in a Promise so fake timers
      // can intercept it (timers/promises.setTimeout is not fakeable in ESM).
      const delay = (ms: number) =>
        new Promise<void>(resolve => globalThis.setTimeout(resolve, ms));

      class B {
        async onModuleInit() {
          await delay(5000);
          onModuleInitStub();
        }

        async onApplicationShutdown() {
          await delay(1000);
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
        await delay(1);
        process.kill(process.pid, signal);
      };
      void Promise.all([applicationContext.init(), deferredShutdown()]);

      await vi.advanceTimersByTimeAsync(1);
      expect(onModuleInitStub).not.toHaveBeenCalled();
      expect(onApplicationShutdownStub).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(5000);
      expect(onModuleInitStub).toHaveBeenCalled();
      expect(onApplicationShutdownStub).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1000);
      expect(onModuleInitStub).toHaveBeenCalled();
      expect(onApplicationShutdownStub).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should use process.exit when useProcessExit option is enabled', async () => {
      const signal = 'SIGTERM';
      const applicationContext = await testHelper(A, Scope.DEFAULT);

      const processExitStub = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => ({}) as any);
      const processKillStub = vi
        .spyOn(process, 'kill')
        .mockImplementation(() => ({}) as any);

      applicationContext.enableShutdownHooks([signal], {
        useProcessExit: true,
      });

      const hookStub = vi
        .spyOn(applicationContext as any, 'callShutdownHook')
        .mockImplementation(async () => undefined);

      const shutdownCleanupRef =
        applicationContext['shutdownCleanupRefs'].get(signal)!;
      await shutdownCleanupRef(signal);

      expect(processExitStub).toHaveBeenCalledWith(0);
      expect(processKillStub).not.toHaveBeenCalled();

      hookStub.mockRestore();
      processExitStub.mockRestore();
      processKillStub.mockRestore();
    });

    it('should use process.kill when useProcessExit option is not enabled', async () => {
      const signal = 'SIGTERM';
      const applicationContext = await testHelper(A, Scope.DEFAULT);

      const processExitStub = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => ({}) as any);
      const processKillStub = vi
        .spyOn(process, 'kill')
        .mockImplementation(() => ({}) as any);

      applicationContext.enableShutdownHooks([signal]);

      const hookStub = vi
        .spyOn(applicationContext as any, 'callShutdownHook')
        .mockImplementation(async () => undefined);

      const shutdownCleanupRef =
        applicationContext['shutdownCleanupRefs'].get(signal)!;
      await shutdownCleanupRef(signal);

      expect(processKillStub).toHaveBeenCalledWith(process.pid, signal);
      expect(processExitStub).not.toHaveBeenCalled();

      hookStub.mockRestore();
      processExitStub.mockRestore();
      processKillStub.mockRestore();
    });
  });

  describe('get', () => {
    describe('when scope = DEFAULT', () => {
      it('should get value with function injection key', async () => {
        const key = A;
        const applicationContext = await testHelper(key, Scope.DEFAULT);

        const a1: A = await applicationContext.get(key);
        const a2: A = await applicationContext.get(key);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).toBe(a2);
      });

      it('should get value with string injection key', async () => {
        const key = 'KEY_A';
        const applicationContext = await testHelper(key, Scope.DEFAULT);

        const a1: A = await applicationContext.get(key);
        const a2: A = await applicationContext.get(key);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).toBe(a2);
      });

      it('should get value with symbol injection key', async () => {
        const key = Symbol('KEY_A');
        const applicationContext = await testHelper(key, Scope.DEFAULT);

        const a1: A = await applicationContext.get(key);
        const a2: A = await applicationContext.get(key);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).toBe(a2);
      });
    });

    describe('when scope = REQUEST', () => {
      it('should throw error when use function injection key', async () => {
        const key = A;
        const applicationContext = await testHelper(key, Scope.REQUEST);

        expect(() => applicationContext.get(key)).toThrow();
      });

      it('should throw error when use string injection key', async () => {
        const key = 'KEY_A';
        const applicationContext = await testHelper(key, Scope.REQUEST);

        expect(() => applicationContext.get(key)).toThrow();
      });

      it('should throw error when use symbol injection key', async () => {
        const key = Symbol('KEY_A');
        const applicationContext = await testHelper(key, Scope.REQUEST);

        expect(() => applicationContext.get(key)).toThrow();
      });
    });

    describe('when scope = TRANSIENT', () => {
      it('should throw error when use function injection key', async () => {
        const key = A;
        const applicationContext = await testHelper(key, Scope.TRANSIENT);

        expect(() => applicationContext.get(key)).toThrow();
      });

      it('should throw error when use string injection key', async () => {
        const key = 'KEY_A';
        const applicationContext = await testHelper(key, Scope.TRANSIENT);

        expect(() => applicationContext.get(key)).toThrow();
      });

      it('should throw error when use symbol injection key', async () => {
        const key = Symbol('KEY_A');
        const applicationContext = await testHelper(key, Scope.TRANSIENT);

        expect(() => applicationContext.get(key)).toThrow();
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

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).toBe(a2);
      });

      it('should resolve value with string injection key', async () => {
        const key = 'KEY_A';
        const applicationContext = await testHelper(key, Scope.DEFAULT);

        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).toBe(a2);
      });

      it('should resolve value with symbol injection key', async () => {
        const key = Symbol('KEY_A');
        const applicationContext = await testHelper(key, Scope.DEFAULT);

        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).toBe(a2);
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

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).not.toBe(a2);
        expect(a2).toBe(a3);
      });

      it('should resolve value with string injection key', async () => {
        const key = 'KEY_A';
        const applicationContext = await testHelper(key, Scope.REQUEST);

        const contextId = ContextIdFactory.create();
        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key, contextId);
        const a3: A = await applicationContext.resolve(key, contextId);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).not.toBe(a2);
        expect(a2).toBe(a3);
      });

      it('should resolve value with symbol injection key', async () => {
        const key = Symbol('KEY_A');
        const applicationContext = await testHelper(key, Scope.REQUEST);

        const contextId = ContextIdFactory.create();
        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key, contextId);
        const a3: A = await applicationContext.resolve(key, contextId);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).not.toBe(a2);
        expect(a2).toBe(a3);
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

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).not.toBe(a2);
        expect(a2).toBe(a3);
      });

      it('should resolve value with string injection key', async () => {
        const key = 'KEY_A';
        const applicationContext = await testHelper(key, Scope.TRANSIENT);

        const contextId = ContextIdFactory.create();
        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key, contextId);
        const a3: A = await applicationContext.resolve(key, contextId);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).not.toBe(a2);
        expect(a2).toBe(a3);
      });

      it('should resolve value with symbol injection key', async () => {
        const key = Symbol('KEY_A');
        const applicationContext = await testHelper(key, Scope.TRANSIENT);

        const contextId = ContextIdFactory.create();
        const a1: A = await applicationContext.resolve(key);
        const a2: A = await applicationContext.resolve(key, contextId);
        const a3: A = await applicationContext.resolve(key, contextId);

        expect(a1).toBeInstanceOf(A);
        expect(a2).toBeInstanceOf(A);
        expect(a1).not.toBe(a2);
        expect(a2).toBe(a3);
      });
    });
  });

  describe('implicit request scope via enhancers', () => {
    it('get() should throw when dependency tree is not static (request-scoped enhancer attached)', async () => {
      class Host {}
      @Injectable({ scope: Scope.REQUEST })
      class ReqScopedPipe {}

      const nestContainer = new NestContainer();
      const injector = new Injector();
      const instanceLoader = new InstanceLoader(
        nestContainer,
        injector,
        new GraphInspector(nestContainer),
      );
      const { moduleRef } = (await nestContainer.addModule(class T {}, []))!;

      // Register Host as a controller (matches real-world controller case)
      nestContainer.addController(Host, moduleRef.token);

      // Register a request-scoped injectable and attach it as an enhancer to Host
      // This simulates a method-level pipe/guard/interceptor making Host implicitly request-scoped
      nestContainer.addInjectable(ReqScopedPipe, moduleRef.token, 'pipe', Host);

      const modules = nestContainer.getModules();
      await instanceLoader.createInstancesOfDependencies(modules);

      const appCtx = new NestApplicationContext(nestContainer);

      // With a non-static dependency tree, get() should refuse and instruct to use resolve()
      expect(() => appCtx.get(Host)).toThrow();
    });

    it('resolve() should instantiate when dependency tree is not static (request-scoped enhancer attached)', async () => {
      class Host {}
      @Injectable({ scope: Scope.REQUEST })
      class ReqScopedPipe {}

      const nestContainer = new NestContainer();
      const injector = new Injector();
      const instanceLoader = new InstanceLoader(
        nestContainer,
        injector,
        new GraphInspector(nestContainer),
      );
      const { moduleRef } = (await nestContainer.addModule(class T {}, []))!;

      // Register Host as a controller
      nestContainer.addController(Host, moduleRef.token);

      nestContainer.addInjectable(ReqScopedPipe, moduleRef.token, 'pipe', Host);

      const modules = nestContainer.getModules();
      await instanceLoader.createInstancesOfDependencies(modules);

      const appCtx = new NestApplicationContext(nestContainer);

      const instance = await appCtx.resolve(Host);
      expect(instance).toBeInstanceOf(Host);
    });
  });

  describe('resolve with each: true', () => {
    it('should resolve all default-scoped providers registered under the same token', async () => {
      class Service1 {}
      class Service2 {}
      class Service3 {}
      const TOKEN = 'MULTI_TOKEN';

      const nestContainer = new NestContainer();
      const injector = new Injector();
      const instanceLoader = new InstanceLoader(
        nestContainer,
        injector,
        new GraphInspector(nestContainer),
      );

      // Create three modules, each with a provider under the same token
      const { moduleRef: module1 } = (await nestContainer.addModule(
        class Module1 {},
        [],
      ))!;
      const { moduleRef: module2 } = (await nestContainer.addModule(
        class Module2 {},
        [],
      ))!;
      const { moduleRef: module3 } = (await nestContainer.addModule(
        class Module3 {},
        [],
      ))!;

      nestContainer.addProvider(
        { provide: TOKEN, useClass: Service1 },
        module1.token,
      );
      nestContainer.addProvider(
        { provide: TOKEN, useClass: Service2 },
        module2.token,
      );
      nestContainer.addProvider(
        { provide: TOKEN, useClass: Service3 },
        module3.token,
      );

      const modules = nestContainer.getModules();
      await instanceLoader.createInstancesOfDependencies(modules);

      const appCtx = new NestApplicationContext(nestContainer);

      const instances = await appCtx.resolve(TOKEN, undefined, {
        strict: false,
        each: true,
      });

      expect(instances).toEqual(expect.any(Array));
      expect(instances).toHaveLength(3);
      expect(instances[0]).toBeInstanceOf(Service1);
      expect(instances[1]).toBeInstanceOf(Service2);
      expect(instances[2]).toBeInstanceOf(Service3);
    });
  });

  describe('snapshot bootstrap', () => {
    it('should not eagerly instantiate an unused transient provider', async () => {
      @Injectable({ scope: Scope.TRANSIENT })
      class UnusedTransient {
        static constructorCalls = 0;

        constructor() {
          UnusedTransient.constructorCalls++;
        }
      }

      const nestContainer = new NestContainer();
      const injector = new Injector({
        preview: false,
        snapshot: true,
      });
      const instanceLoader = new InstanceLoader(
        nestContainer,
        injector,
        new GraphInspector(nestContainer),
      );
      const { moduleRef } = (await nestContainer.addModule(class T {}, []))!;

      nestContainer.addProvider(UnusedTransient, moduleRef.token);

      const modules = nestContainer.getModules();
      await instanceLoader.createInstancesOfDependencies(modules);

      expect(UnusedTransient.constructorCalls).toBe(0);

      const appCtx = new NestApplicationContext(nestContainer, {
        snapshot: true,
      });
      const instance = await appCtx.resolve(UnusedTransient);

      expect(instance).toBeInstanceOf(UnusedTransient);
      expect(UnusedTransient.constructorCalls).toBe(1);
    });
  });

  describe('enableProcessErrorHandlers', () => {
    function baselineOf(event: string) {
      return new Set(process.listeners(event as any));
    }

    function restoreListeners(event: string, baseline: Set<unknown>) {
      process.listeners(event as any).forEach(listener => {
        if (!baseline.has(listener)) {
          process.removeListener(event as any, listener);
        }
      });
    }

    it('should not subscribe to any process event when no handler is given', async () => {
      const uncaught = process.listenerCount('uncaughtException');
      const rejection = process.listenerCount('unhandledRejection');
      const applicationContext = await testHelper(A, Scope.DEFAULT);

      applicationContext.enableProcessErrorHandlers({});

      expect(process.listenerCount('uncaughtException')).toBe(uncaught);
      expect(process.listenerCount('unhandledRejection')).toBe(rejection);
    });

    it('should keep the process alive when the handler does not shut it down', async () => {
      const baseline = baselineOf('uncaughtException');
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => undefined) as any);
      const handler = vi.fn();

      try {
        applicationContext.enableProcessErrorHandlers({
          uncaughtException: handler,
        });

        const error = new Error('boom');
        applicationContext['processErrorCleanupRefs'].get('uncaughtException')!(
          error,
        );
        await new Promise(resolve => setImmediate(resolve));

        expect(handler).toHaveBeenCalledWith(error, {
          origin: 'uncaughtException',
          shutdown: expect.any(Function),
        });
        expect(exitSpy).not.toHaveBeenCalled();
      } finally {
        exitSpy.mockRestore();
        restoreListeners('uncaughtException', baseline);
      }
    });

    it('should run the shutdown sequence and exit when the handler asks for it', async () => {
      const baseline = baselineOf('unhandledRejection');
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => undefined) as any);
      const hookStub = vi
        .spyOn(applicationContext as any, 'callShutdownHook')
        .mockImplementation(async () => undefined);

      try {
        applicationContext.enableProcessErrorHandlers({
          unhandledRejection: (_error, { shutdown }) =>
            shutdown({ exitCode: 7 }),
        });

        applicationContext['processErrorCleanupRefs'].get(
          'unhandledRejection',
        )!(new Error('boom'));

        await vi.waitFor(() => expect(exitSpy).toHaveBeenCalledWith(7));
        expect(hookStub).toHaveBeenCalledWith('unhandledRejection');
      } finally {
        exitSpy.mockRestore();
        hookStub.mockRestore();
        restoreListeners('unhandledRejection', baseline);
      }
    });

    it('should exit with code 1 by default when the handler asks to shut down', async () => {
      const baseline = baselineOf('uncaughtException');
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => undefined) as any);
      const hookStub = vi
        .spyOn(applicationContext as any, 'callShutdownHook')
        .mockImplementation(async () => undefined);

      try {
        applicationContext.enableProcessErrorHandlers({
          uncaughtException: (_error, { shutdown }) => shutdown(),
        });

        applicationContext['processErrorCleanupRefs'].get('uncaughtException')!(
          new Error('boom'),
        );

        await vi.waitFor(() => expect(exitSpy).toHaveBeenCalledWith(1));
      } finally {
        exitSpy.mockRestore();
        hookStub.mockRestore();
        restoreListeners('uncaughtException', baseline);
      }
    });

    it('should report the origin Node.js gives an unhandled rejection promoted to uncaughtException', async () => {
      const baseline = baselineOf('uncaughtException');
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      const handler = vi.fn();

      try {
        applicationContext.enableProcessErrorHandlers({
          uncaughtException: handler,
        });

        // Without an `unhandledRejection` listener of its own, Node.js
        // raises the rejection here and passes 'unhandledRejection' as the
        // second argument, even though this listener is subscribed to
        // 'uncaughtException'.
        const error = new Error('dropped promise');
        applicationContext['processErrorCleanupRefs'].get('uncaughtException')!(
          error,
          'unhandledRejection',
        );
        await new Promise(resolve => setImmediate(resolve));

        expect(handler).toHaveBeenCalledWith(error, {
          origin: 'unhandledRejection',
          shutdown: expect.any(Function),
        });
      } finally {
        restoreListeners('uncaughtException', baseline);
      }
    });

    it('should force the exit once the deadline elapses, even if the shutdown sequence is still pending', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout'] });
      const baseline = baselineOf('uncaughtException');
      const applicationContext = await testHelper(A, Scope.DEFAULT);

      // Use global setTimeout wrapped in a Promise so fake timers can
      // intercept it (timers/promises.setTimeout is not fakeable in ESM).
      const delay = (ms: number) =>
        new Promise<void>(resolve => globalThis.setTimeout(resolve, ms));

      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => undefined) as any);
      const hookStub = vi
        .spyOn(applicationContext as any, 'callShutdownHook')
        .mockImplementation(() => delay(5000));

      try {
        applicationContext.enableProcessErrorHandlers({
          uncaughtException: (_error, { shutdown }) =>
            shutdown({ exitCode: 2, timeout: 1000 }),
        });

        const listener =
          applicationContext['processErrorCleanupRefs'].get(
            'uncaughtException',
          )!;
        const listenerDone = listener(new Error('boom'));

        await vi.advanceTimersByTimeAsync(999);
        expect(exitSpy).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        await listenerDone;

        expect(exitSpy).toHaveBeenCalledWith(2);
      } finally {
        hookStub.mockRestore();
        exitSpy.mockRestore();
        restoreListeners('uncaughtException', baseline);
        vi.useRealTimers();
      }
    });

    it('should wait for the shutdown sequence indefinitely when the timeout is not finite', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout'] });
      const baseline = baselineOf('uncaughtException');
      const applicationContext = await testHelper(A, Scope.DEFAULT);

      const delay = (ms: number) =>
        new Promise<void>(resolve => globalThis.setTimeout(resolve, ms));

      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => undefined) as any);
      const hookStub = vi
        .spyOn(applicationContext as any, 'callShutdownHook')
        .mockImplementation(() => delay(60 * 60 * 1000));

      try {
        applicationContext.enableProcessErrorHandlers({
          uncaughtException: (_error, { shutdown }) =>
            shutdown({ timeout: Infinity }),
        });

        const listener =
          applicationContext['processErrorCleanupRefs'].get(
            'uncaughtException',
          )!;
        const listenerDone = listener(new Error('boom'));

        // A clamped, non-finite setTimeout would have fired within 1ms;
        // advancing far past that proves no deadline is racing at all.
        await vi.advanceTimersByTimeAsync(60 * 60 * 1000 - 1);
        expect(exitSpy).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        await listenerDone;

        expect(exitSpy).toHaveBeenCalledWith(1);
      } finally {
        hookStub.mockRestore();
        exitSpy.mockRestore();
        restoreListeners('uncaughtException', baseline);
        vi.useRealTimers();
      }
    });

    it('should still exit when the shutdown sequence itself rejects', async () => {
      const baseline = baselineOf('uncaughtException');
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => undefined) as any);
      const loggerSpy = vi
        .spyOn(Logger, 'error')
        .mockImplementation(() => undefined);
      const shutdownError = new Error('callShutdownHook exploded');
      const hookStub = vi
        .spyOn(applicationContext as any, 'callShutdownHook')
        .mockImplementation(async () => {
          throw shutdownError;
        });

      try {
        applicationContext.enableProcessErrorHandlers({
          uncaughtException: (_error, { shutdown }) =>
            shutdown({ exitCode: 3 }),
        });

        applicationContext['processErrorCleanupRefs'].get('uncaughtException')!(
          new Error('boom'),
        );

        await vi.waitFor(() => expect(exitSpy).toHaveBeenCalledWith(3));
        expect(loggerSpy).toHaveBeenCalledWith(
          MESSAGES.ERROR_DURING_SHUTDOWN,
          shutdownError.stack,
          'NestApplicationContext',
        );
      } finally {
        hookStub.mockRestore();
        loggerSpy.mockRestore();
        exitSpy.mockRestore();
        restoreListeners('uncaughtException', baseline);
      }
    });

    it('should log an error thrown by the handler instead of letting it escape', async () => {
      const baseline = baselineOf('uncaughtException');
      const applicationContext = await testHelper(A, Scope.DEFAULT);
      const loggerSpy = vi
        .spyOn(Logger, 'error')
        .mockImplementation(() => undefined);

      try {
        const handlerError = new Error('the reporter is broken');
        applicationContext.enableProcessErrorHandlers({
          uncaughtException: () => {
            throw handlerError;
          },
        });

        applicationContext['processErrorCleanupRefs'].get('uncaughtException')!(
          new Error('boom'),
        );
        await new Promise(resolve => setImmediate(resolve));

        expect(loggerSpy).toHaveBeenCalledWith(
          handlerError,
          handlerError.stack,
          'NestApplicationContext',
        );
      } finally {
        loggerSpy.mockRestore();
        restoreListeners('uncaughtException', baseline);
      }
    });

    it('should register a single listener per event and remove it on close', async () => {
      const baseline = baselineOf('uncaughtException');
      const applicationContext = await testHelper(A, Scope.DEFAULT);

      try {
        applicationContext.enableProcessErrorHandlers({
          uncaughtException: () => undefined,
        });
        applicationContext.enableProcessErrorHandlers({
          uncaughtException: () => undefined,
        });

        expect(process.listenerCount('uncaughtException')).toBe(
          baseline.size + 1,
        );

        await applicationContext.close();

        expect(process.listenerCount('uncaughtException')).toBe(baseline.size);
      } finally {
        restoreListeners('uncaughtException', baseline);
      }
    });
  });
});
