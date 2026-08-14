import { Injectable, Scope, Type } from '@nestjs/common';
import { RuntimeException } from '../../errors/exceptions';
import { NestContainer } from '../../injector/container';
import { ModuleRef } from '../../injector/module-ref';
import { Module } from '../../injector/module';
import { ContextId } from '../../injector/instance-wrapper';
import { STATIC_CONTEXT } from '../../injector/constants';
import { InstanceLoader } from '../../injector/instance-loader';
import { Injector } from '../../injector/injector';
import { GraphInspector } from '../../inspector/graph-inspector';
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
      expect(result.scope).toBe(Scope.DEFAULT);
    });

    it('should return Scope.REQUEST for a request-scoped provider', () => {
      @Injectable({ scope: Scope.REQUEST })
      class ReqScopedService {}
      container.addProvider(ReqScopedService, module.token);
      const result = moduleRef.introspect(ReqScopedService);
      expect(result.scope).toBe(Scope.REQUEST);
    });

    it('should return Scope.TRANSIENT for a transient provider', () => {
      @Injectable({ scope: Scope.TRANSIENT })
      class TransientService {}
      container.addProvider(TransientService, module.token);
      const result = moduleRef.introspect(TransientService);
      expect(result.scope).toBe(Scope.TRANSIENT);
    });
  });

  describe('registerRequestByContextId', () => {
    it('should delegate to container.registerRequestProvider', () => {
      const stub = vi
        .spyOn(container, 'registerRequestProvider')
        .mockImplementation(() => {});
      const request = { foo: 'bar' };
      const contextId = { id: 42 };
      moduleRef.registerRequestByContextId(request, contextId);
      expect(stub).toHaveBeenCalledExactlyOnceWith(request, contextId);
      stub.mockRestore();
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
      expect(instance).toBeInstanceOf(Foo);
      expect(instance.a).toBeInstanceOf(A);
      expect(instance.b).toBeInstanceOf(B);
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
        expect(err).toBeInstanceOf(RuntimeException);
      }
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
      expect(instance).toBeInstanceOf(MyService);
    });

    it('should throw InvalidClassScopeException for request-scoped provider', () => {
      @Injectable({ scope: Scope.REQUEST })
      class ReqService {}
      container.addProvider(ReqService, module.token);
      expect(() => moduleRef.get(ReqService)).toThrow();
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
      expect(instances).toHaveLength(3);
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
      expect(instance).toBeInstanceOf(MyService);
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
      expect(a).toBeInstanceOf(TransientService);
      expect(b).toBeInstanceOf(TransientService);
      expect(a).not.toBe(b);
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
      expect(instance).toBeInstanceOf(ReqService);
    });
  });
});
