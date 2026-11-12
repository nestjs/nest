import { Inject, Injectable, Scope, Type } from '@nestjs/common';
import { RuntimeException } from '../../errors/exceptions';
import { RequestScopedCreateException } from '../../errors/exceptions/request-scoped-create.exception';
import { createContextId } from '../../helpers/context-id-factory';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { NestContainer } from '../../injector/container';
import { ModuleRef } from '../../injector/module-ref';
import { Module } from '../../injector/module';
import { ContextId } from '../../injector/instance-wrapper';
import { STATIC_CONTEXT } from '../../injector/constants';
import { InstanceLoader } from '../../injector/instance-loader';
import { Injector } from '../../injector/injector';
import { DeterministicUuidRegistry } from '../../inspector/deterministic-uuid-registry';
import { GraphInspector } from '../../inspector/graph-inspector';
import { UuidFactory, UuidFactoryMode } from '../../inspector/uuid-factory';
import { InstanceWrapper } from '../../injector/instance-wrapper';

class ConcreteModuleRef extends ModuleRef {
  get<TInput = any, TResult = TInput>(
    typeOrToken: any,
    options?: any,
  ): TResult | Array<TResult> {
    return this.find(typeOrToken, {
      moduleId: options?.strict
        ? (this.container.getModules().values().next().value?.id ?? undefined)
        : undefined,
      each: options?.each,
    });
  }

  resolve<TInput = any, TResult = TInput>(
    typeOrToken: any,
    contextId?: { id: number },
    options?: any,
  ): Promise<TResult | Array<TResult>> {
    const contextModule = this.container.getModules().values().next().value!;
    return this.resolvePerContext(
      typeOrToken,
      contextModule,
      contextId ?? STATIC_CONTEXT,
      options,
    );
  }

  create<T = any>(type: Type<T>, contextId?: ContextId): Promise<T> {
    const contextModule = this.container.getModules().values().next().value!;
    return this.instantiateClass(type, contextModule, contextId);
  }
}

describe('ModuleRef', () => {
  let container: NestContainer;
  let moduleRef: ConcreteModuleRef;
  let module: Module;

  beforeEach(async () => {
    container = new NestContainer();
    const { moduleRef: mod } = (await container.addModule(
      class TestModule {},
      [],
    ))!;
    module = mod;
    moduleRef = new ConcreteModuleRef(container);
  });

  describe('introspect', () => {
    it('should return Scope.DEFAULT for a static provider', () => {
      class StaticService {}
      container.addProvider(StaticService, module.token);
      const result = moduleRef.introspect(StaticService);
      expect(result.scope).to.equal(Scope.DEFAULT);
    });

    it('should return Scope.REQUEST for a request-scoped provider', () => {
      @Injectable({ scope: Scope.REQUEST })
      class ReqScopedService {}
      container.addProvider(ReqScopedService, module.token);
      const result = moduleRef.introspect(ReqScopedService);
      expect(result.scope).to.equal(Scope.REQUEST);
    });

    it('should return Scope.TRANSIENT for a transient provider', () => {
      @Injectable({ scope: Scope.TRANSIENT })
      class TransientService {}
      container.addProvider(TransientService, module.token);
      const result = moduleRef.introspect(TransientService);
      expect(result.scope).to.equal(Scope.TRANSIENT);
    });
  });

  describe('registerRequestByContextId', () => {
    it('should delegate to container.registerRequestProvider', () => {
      const stub = sinon.stub(container, 'registerRequestProvider');
      const request = { foo: 'bar' };
      const contextId = { id: 42 };
      moduleRef.registerRequestByContextId(request, contextId);
      expect(stub.calledOnceWith(request, contextId)).to.be.true;
      stub.restore();
    });
  });

  describe('instantiateClass', () => {
    it('should create an instance with resolved dependencies', async () => {
      @Injectable()
      class A {}
      @Injectable()
      class B {}
      container.addProvider(A, module.token);
      container.addProvider(B, module.token);

      @Injectable()
      class Foo {
        constructor(
          public a: A,
          public b: B,
        ) {}
      }

      const instance = await moduleRef.create(Foo);
      expect(instance).to.be.instanceOf(Foo);
      expect(instance.a).to.be.instanceOf(A);
      expect(instance.b).to.be.instanceOf(B);
    });

    it('should propagate errors from dependency resolution', async () => {
      class UnregisteredDep {}

      @Injectable()
      class MissingDep {
        constructor(_x: UnregisteredDep) {}
      }

      try {
        await moduleRef.create(MissingDep);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(RuntimeException);
      }
    });

    describe('when ids are deterministic (snapshot mode)', () => {
      beforeEach(() => {
        UuidFactory.mode = UuidFactoryMode.Deterministic;
      });

      afterEach(() => {
        sinon.restore();
        UuidFactory.mode = UuidFactoryMode.Random;
        DeterministicUuidRegistry.clear();
      });

      it('should not take an id from the registry for every call', async () => {
        @Injectable()
        class Foo {}

        const getSpy = sinon.spy(DeterministicUuidRegistry, 'get');
        await moduleRef.create(Foo);
        await moduleRef.create(Foo);

        expect(getSpy.called).to.be.false;
      });
    });

    describe('when the created class has dependencies', () => {
      @Injectable()
      class SingletonDep {}
      @Injectable({ scope: Scope.TRANSIENT })
      class NestedTransientDep {}
      @Injectable({ scope: Scope.TRANSIENT })
      class TransientDep {
        constructor(public nested: NestedTransientDep) {}
      }

      let singletonWrapper: InstanceWrapper;
      let transientWrapper: InstanceWrapper;
      let nestedTransientWrapper: InstanceWrapper;

      beforeEach(() => {
        container.addProvider(SingletonDep, module.token);
        container.addProvider(TransientDep, module.token);
        container.addProvider(NestedTransientDep, module.token);
        singletonWrapper = module.providers.get(SingletonDep)!;
        transientWrapper = module.providers.get(TransientDep)!;
        nestedTransientWrapper = module.providers.get(NestedTransientDep)!;
      });

      afterEach(() => sinon.restore());

      it('should not keep the transient instances it created', async () => {
        @Injectable()
        class Created {
          constructor(public dep: TransientDep) {}
        }

        await moduleRef.create(Created);
        await moduleRef.create(Created);

        expect(transientWrapper.getStaticTransientInstances()).to.deep.equal(
          [],
        );
        expect(
          nestedTransientWrapper.getStaticTransientInstances(),
        ).to.deep.equal([]);
      });

      it('should not keep the transient instances of injected properties', async () => {
        @Injectable()
        class Created {
          @Inject(TransientDep)
          public dep: TransientDep;
        }

        await moduleRef.create(Created);

        expect(transientWrapper.getStaticTransientInstances()).to.deep.equal(
          [],
        );
        expect(
          nestedTransientWrapper.getStaticTransientInstances(),
        ).to.deep.equal([]);
      });

      it('should not stay a dependency tree parent of its dependencies', async () => {
        @Injectable()
        class Created {
          constructor(public dep: SingletonDep) {}
        }
        await moduleRef.create(Created);

        const resetDependencyTreeState = sinon.spy(
          InstanceWrapper.prototype as any,
          'resetDependencyTreeState',
        );
        singletonWrapper.addEnhancerMetadata(new InstanceWrapper());

        expect(resetDependencyTreeState.calledOnce).to.be.true;
      });

      it('should not stay a dependency tree parent of its dependencies when it rejects', async () => {
        class UnregisteredDep {}
        @Injectable()
        class Created {
          constructor(
            public dep: SingletonDep,
            _missing: UnregisteredDep,
          ) {}
        }
        let error: unknown;
        try {
          await moduleRef.create(Created);
        } catch (err) {
          error = err;
        }
        expect(error).to.be.instanceOf(RuntimeException);

        const resetDependencyTreeState = sinon.spy(
          InstanceWrapper.prototype as any,
          'resetDependencyTreeState',
        );
        singletonWrapper.addEnhancerMetadata(new InstanceWrapper());

        expect(resetDependencyTreeState.calledOnce).to.be.true;
      });

      // The instances of the wrapper for the given context, including those of
      // every inquirer of a transient provider
      const getExistingInstancesByContextId = (
        wrapper: InstanceWrapper,
        contextId: ContextId,
      ) =>
        [wrapper['values'], ...(wrapper['transientMap']?.values() ?? [])]
          .map(collection => collection.get(contextId))
          .filter(instancePerContext => instancePerContext !== undefined);

      const rejectionOf = (promise: Promise<unknown>) =>
        promise.then(
          () => {
            throw new Error('Expected a rejection');
          },
          (err: Error) => err,
        );

      it('should not keep the transient instances still being created when it rejects', async () => {
        class UnregisteredDep {}
        @Injectable()
        class Created {
          constructor(
            public dep: TransientDep,
            _missing: UnregisteredDep,
          ) {}
        }
        expect(await rejectionOf(moduleRef.create(Created))).to.be.instanceOf(
          RuntimeException,
        );
        // Lets a load that outlived the rejection finish
        await new Promise(resolve => setImmediate(resolve));

        expect(transientWrapper.getStaticTransientInstances()).to.deep.equal(
          [],
        );
        expect(
          nestedTransientWrapper.getStaticTransientInstances(),
        ).to.deep.equal([]);
      });

      it('should not keep the transient instances still being created when a dependency fails', async () => {
        @Injectable({ scope: Scope.REQUEST })
        class FailingDep {
          constructor() {
            throw new Error('failing');
          }
        }
        @Injectable()
        class Created {
          constructor(
            _failing: FailingDep,
            public dep: TransientDep,
          ) {}
        }
        container.addProvider(FailingDep, module.token);

        const contextId = createContextId();
        expect(
          (await rejectionOf(moduleRef.create(Created, contextId))).message,
        ).to.equal('failing');
        await new Promise(resolve => setImmediate(resolve));

        expect(
          getExistingInstancesByContextId(transientWrapper, contextId),
        ).to.deep.equal([]);
        expect(
          getExistingInstancesByContextId(nestedTransientWrapper, contextId),
        ).to.deep.equal([]);
      });

      it('should not keep the transient instances still being created when an injected property fails', async () => {
        class UnregisteredDep {}
        @Injectable()
        class Created {
          @Inject(TransientDep)
          public dep: TransientDep;
          @Inject(UnregisteredDep)
          public missing: UnregisteredDep;
        }
        expect(await rejectionOf(moduleRef.create(Created))).to.be.instanceOf(
          RuntimeException,
        );
        await new Promise(resolve => setImmediate(resolve));

        expect(transientWrapper.getStaticTransientInstances()).to.deep.equal(
          [],
        );
        expect(
          nestedTransientWrapper.getStaticTransientInstances(),
        ).to.deep.equal([]);
      });

      describe('when a dependency of a transient dependency fails', () => {
        @Injectable({ scope: Scope.REQUEST })
        class FailingDep {
          constructor() {
            throw new Error('failing');
          }
        }
        @Injectable({ scope: Scope.TRANSIENT })
        class OuterTransientDep {
          constructor(public dep: TransientDep) {}
        }
        @Injectable({ scope: Scope.TRANSIENT })
        class HostWithParams {
          constructor(
            _failing: FailingDep,
            public dep: OuterTransientDep,
          ) {}
        }

        beforeEach(() => {
          container.addProvider(FailingDep, module.token);
          container.addProvider(OuterTransientDep, module.token);
          container.addProvider(HostWithParams, module.token);
        });

        const cases: Array<[string, Type<unknown>]> = [
          ['constructor parameters', HostWithParams],
        ];
        cases.forEach(([description, Host]) => {
          it(`should not keep the transient instances still being created (${description})`, async () => {
            @Injectable()
            class Created {
              constructor(@Inject(Host) public host: unknown) {}
            }

            // From the second call on, the dependencies of the host are
            // resolved from its metadata
            const contextIds = [createContextId(), createContextId()];
            for (const contextId of contextIds) {
              expect(
                (await rejectionOf(moduleRef.create(Created, contextId)))
                  .message,
              ).to.equal('failing');
              await new Promise(resolve => setImmediate(resolve));
            }

            const wrappers = [
              module.providers.get(OuterTransientDep)!,
              transientWrapper,
              nestedTransientWrapper,
            ];
            for (const contextId of contextIds) {
              for (const wrapper of wrappers) {
                expect(
                  getExistingInstancesByContextId(wrapper, contextId),
                ).to.deep.equal([]);
              }
            }
          });
        });
      });
    });

    describe('when a dependency is request-scoped', () => {
      @Injectable({ scope: Scope.REQUEST })
      class RequestDep {}
      @Injectable()
      class Created {
        constructor(public dep: RequestDep) {}
      }

      beforeEach(() => {
        container.addProvider(RequestDep, module.token);
      });

      it('should reject without a context id', async () => {
        let error: unknown;
        try {
          await moduleRef.create(Created);
        } catch (err) {
          error = err;
        }
        expect(error).to.be.instanceOf(RequestScopedCreateException);
      });

      it('should resolve with a context id', async () => {
        const instance = await moduleRef.create(Created, createContextId());

        expect(instance.dep).to.be.instanceOf(RequestDep);
      });

      describe('and it is injected into a property', () => {
        @Injectable()
        class CreatedWithProperty {
          @Inject(RequestDep)
          public dep: RequestDep;
        }

        it('should reject without a context id', async () => {
          let error: unknown;
          try {
            await moduleRef.create(CreatedWithProperty);
          } catch (err) {
            error = err;
          }
          expect(error).to.be.instanceOf(RequestScopedCreateException);
        });

        it('should reject with the static context id', async () => {
          let error: unknown;
          try {
            await moduleRef.create(CreatedWithProperty, STATIC_CONTEXT);
          } catch (err) {
            error = err;
          }
          expect(error).to.be.instanceOf(RequestScopedCreateException);
        });

        it('should resolve with a context id', async () => {
          const first = await moduleRef.create(
            CreatedWithProperty,
            createContextId(),
          );
          const second = await moduleRef.create(
            CreatedWithProperty,
            createContextId(),
          );

          expect(first.dep).to.be.instanceOf(RequestDep);
          expect(second.dep).to.be.instanceOf(RequestDep);
          expect(first.dep).not.to.equal(second.dep);
        });
      });

      describe('and it is injected into a property of a dependency', () => {
        @Injectable()
        class StaticDep {
          @Inject(RequestDep)
          public dep: RequestDep;
        }
        @Injectable()
        class CreatedWithNestedProperty {
          constructor(public dep: StaticDep) {}
        }

        beforeEach(() => {
          container.addProvider(StaticDep, module.token);
        });

        it('should reject without a context id', async () => {
          let error: unknown;
          try {
            await moduleRef.create(CreatedWithNestedProperty);
          } catch (err) {
            error = err;
          }
          expect(error).to.be.instanceOf(RequestScopedCreateException);
        });

        it('should resolve with a context id', async () => {
          const instance = await moduleRef.create(
            CreatedWithNestedProperty,
            createContextId(),
          );

          expect(instance.dep).to.be.instanceOf(StaticDep);
          expect(instance.dep.dep).to.be.instanceOf(RequestDep);
        });
      });
    });

    it('should create a request-scoped class without a context id when its dependencies are static', async () => {
      @Injectable()
      class SingletonDep {}
      container.addProvider(SingletonDep, module.token);
      await new InstanceLoader(
        container,
        new Injector(),
        new GraphInspector(container),
      ).createInstancesOfDependencies(container.getModules());

      @Injectable({ scope: Scope.REQUEST })
      class Created {
        @Inject(SingletonDep)
        public dep: SingletonDep;

        constructor(public ctorDep: SingletonDep) {}
      }

      const instance = await moduleRef.create(Created);

      expect(instance).to.be.instanceOf(Created);
      expect(instance.dep).to.be.instanceOf(SingletonDep);
      expect(instance.ctorDep).to.equal(instance.dep);
    });
  });

  describe('find', () => {
    let instanceLoader: InstanceLoader;

    beforeEach(async () => {
      const injector = new Injector();
      instanceLoader = new InstanceLoader(
        container,
        injector,
        new GraphInspector(container),
      );
    });

    it('should retrieve a static provider instance', async () => {
      @Injectable()
      class MyService {}
      container.addProvider(MyService, module.token);
      await instanceLoader.createInstancesOfDependencies(
        container.getModules(),
      );
      const instance = moduleRef.get(MyService);
      expect(instance).to.be.instanceOf(MyService);
    });

    it('should throw InvalidClassScopeException for request-scoped provider', () => {
      @Injectable({ scope: Scope.REQUEST })
      class ReqService {}
      container.addProvider(ReqService, module.token);
      expect(() => moduleRef.get(ReqService)).to.throw();
    });

    it('should return all instances when each: true', async () => {
      @Injectable()
      class ServiceA {}
      @Injectable()
      class ServiceB {}
      @Injectable()
      class ServiceC {}
      const TOKEN = 'MULTI';
      const { moduleRef: modA } = (await container.addModule(
        class ModA {},
        [],
      ))!;
      const { moduleRef: modB } = (await container.addModule(
        class ModB {},
        [],
      ))!;
      container.addProvider({ provide: TOKEN, useClass: ServiceA }, modA.token);
      container.addProvider({ provide: TOKEN, useClass: ServiceB }, modB.token);
      container.addProvider(
        { provide: TOKEN, useClass: ServiceC },
        module.token,
      );
      await instanceLoader.createInstancesOfDependencies(
        container.getModules(),
      );
      const instances = moduleRef.get(TOKEN, { each: true });
      expect(instances).to.have.length(3);
    });
  });

  describe('resolve', () => {
    let instanceLoader: InstanceLoader;

    beforeEach(async () => {
      const injector = new Injector();
      instanceLoader = new InstanceLoader(
        container,
        injector,
        new GraphInspector(container),
      );
    });

    it('should resolve a static dependency', async () => {
      @Injectable()
      class MyService {}
      container.addProvider(MyService, module.token);
      await instanceLoader.createInstancesOfDependencies(
        container.getModules(),
      );
      const instance = await moduleRef.resolve(MyService);
      expect(instance).to.be.instanceOf(MyService);
    });

    it('should resolve a transient dependency, returning new instances each time', async () => {
      @Injectable({ scope: Scope.TRANSIENT })
      class TransientService {}

      container.addProvider(TransientService, module.token);
      await instanceLoader.createInstancesOfDependencies(
        container.getModules(),
      );
      const a = await moduleRef.resolve(TransientService, { id: 1 });
      const b = await moduleRef.resolve(TransientService, { id: 2 });
      expect(a).to.be.instanceOf(TransientService);
      expect(b).to.be.instanceOf(TransientService);
      expect(a).not.to.equal(b);
    });

    it('should resolve a request-scoped dependency', async () => {
      @Injectable({ scope: Scope.REQUEST })
      class ReqService {}

      container.addProvider(ReqService, module.token);
      await instanceLoader.createInstancesOfDependencies(
        container.getModules(),
      );
      const contextId = { id: 99 };
      const instance = await moduleRef.resolve(ReqService, contextId);
      expect(instance).to.be.instanceOf(ReqService);
    });
  });
});
