import { expect } from 'chai';
import { InjectionToken, Logger, Scope } from '@nestjs/common';
import { ContextIdFactory } from '../helpers/context-id-factory';
import { InstanceLoader } from '../injector/instance-loader';
import { NestContainer } from '../injector/container';
import { NestApplicationContext } from '../nest-application-context';

describe('NestApplicationContext', () => {
  class A {}

  async function testHelper(
    injectionKey: InjectionToken,
    scope: Scope,
  ): Promise<NestApplicationContext> {
    const nestContainer = new NestContainer();
    const instanceLoader = new InstanceLoader(nestContainer);
    const module = await nestContainer.addModule(class T {}, []);

    nestContainer.addProvider(
      {
        provide: injectionKey,
        useClass: A,
        scope,
      },
      module.token,
    );

    nestContainer.addInjectable(
      {
        provide: injectionKey,
        useClass: A,
        scope,
      },
      module.token,
    );

    const modules = nestContainer.getModules();
    await instanceLoader.createInstancesOfDependencies(modules);

    const applicationContext = new NestApplicationContext(nestContainer, []);
    return applicationContext;
  }

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
