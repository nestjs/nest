import { Scope } from '@nestjs/common';
import { expect, assert } from 'chai';
import { NestContainer } from '../injector/container';
import { NestApplicationContext } from '../nest-application-context';
import { InstanceLoader } from '../injector/instance-loader';

class A {}
class B {}
class C {}

describe('NestApplicationContext', () => {
  describe('get', () => {
    it('should get value with function injection key when scope is DEFAULT', async () => {
      const nestContainer = new NestContainer();
      const instanceLoader = new InstanceLoader(nestContainer);
      const module = await nestContainer.addModule(class T {}, []);

      const key = A;
      nestContainer.addProvider(
        {
          provide: key,
          useClass: A,
          scope: Scope.DEFAULT,
        },
        module.token,
      );
      nestContainer.addInjectable(
        {
          provide: key,
          useClass: A,
          scope: Scope.DEFAULT,
        },
        module.token,
      );

      instanceLoader.createInstancesOfDependencies(nestContainer.getModules());
      const applicationContext = new NestApplicationContext(nestContainer, []);
      const a1: A = await applicationContext.get(key);
      const a2: A = await applicationContext.get(key);

      expect(a1).instanceOf(A);
      expect(a2).instanceOf(A);
      expect(a1).equal(a2);
    });

    it('should get value with string injection key when scope is DEFAULT', async () => {
      const nestContainer = new NestContainer();
      const instanceLoader = new InstanceLoader(nestContainer);
      const module = await nestContainer.addModule(class T {}, []);

      const key = 'KEY_A';
      nestContainer.addProvider(
        {
          provide: key,
          useClass: A,
          scope: Scope.DEFAULT,
        },
        module.token,
      );
      nestContainer.addInjectable(
        {
          provide: key,
          useClass: A,
          scope: Scope.DEFAULT,
        },
        module.token,
      );

      instanceLoader.createInstancesOfDependencies(nestContainer.getModules());
      const applicationContext = new NestApplicationContext(nestContainer, []);
      const a1: A = await applicationContext.get(key);
      const a2: A = await applicationContext.get(key);

      expect(a1).instanceOf(A);
      expect(a2).instanceOf(A);
      expect(a1).equal(a2);
    });

    it('should get value with symbol injection key when scope is DEFAULT', async () => {
      const nestContainer = new NestContainer();
      const instanceLoader = new InstanceLoader(nestContainer);
      const module = await nestContainer.addModule(class T {}, []);

      const key = Symbol('KEY_A');
      nestContainer.addProvider(
        {
          provide: key,
          useClass: A,
          scope: Scope.DEFAULT,
        },
        module.token,
      );
      nestContainer.addInjectable(
        {
          provide: key,
          useClass: A,
          scope: Scope.DEFAULT,
        },
        module.token,
      );

      instanceLoader.createInstancesOfDependencies(nestContainer.getModules());
      const applicationContext = new NestApplicationContext(nestContainer, []);
      const a1: A = await applicationContext.get(key);
      const a2: A = await applicationContext.get(key);

      expect(a1).instanceOf(A);
      expect(a2).instanceOf(A);
      expect(a1).equal(a2);
    });

    it('should throw error when use function injection key and scope is REQUEST', async () => {
      const nestContainer = new NestContainer();
      const instanceLoader = new InstanceLoader(nestContainer);
      const module = await nestContainer.addModule(class T {}, []);

      const key = A;
      nestContainer.addProvider(
        {
          provide: key,
          useClass: A,
          scope: Scope.REQUEST,
        },
        module.token,
      );
      nestContainer.addInjectable(
        {
          provide: key,
          useClass: A,
          scope: Scope.REQUEST,
        },
        module.token,
      );

      instanceLoader.createInstancesOfDependencies(nestContainer.getModules());
      const applicationContext = new NestApplicationContext(nestContainer, []);

      expect(() => applicationContext.get(key)).to.be.throw;
    });

    it('should throw error when use string injection key and scope is REQUEST', async () => {
      const nestContainer = new NestContainer();
      const instanceLoader = new InstanceLoader(nestContainer);
      const module = await nestContainer.addModule(class T {}, []);

      const key = 'KEY_A';
      nestContainer.addProvider(
        {
          provide: key,
          useClass: A,
          scope: Scope.REQUEST,
        },
        module.token,
      );
      nestContainer.addInjectable(
        {
          provide: key,
          useClass: A,
          scope: Scope.REQUEST,
        },
        module.token,
      );

      instanceLoader.createInstancesOfDependencies(nestContainer.getModules());
      const applicationContext = new NestApplicationContext(nestContainer, []);

      expect(() => applicationContext.get(key)).to.be.throw;
    });

    it('should throw error when use symbol injection key and scope is REQUEST', async () => {
      const nestContainer = new NestContainer();
      const instanceLoader = new InstanceLoader(nestContainer);
      const module = await nestContainer.addModule(class T {}, []);

      const key = Symbol('KEY_A');
      nestContainer.addProvider(
        {
          provide: key,
          useClass: A,
          scope: Scope.REQUEST,
        },
        module.token,
      );
      nestContainer.addInjectable(
        {
          provide: key,
          useClass: A,
          scope: Scope.REQUEST,
        },
        module.token,
      );

      instanceLoader.createInstancesOfDependencies(nestContainer.getModules());
      const applicationContext = new NestApplicationContext(nestContainer, []);

      expect(() => applicationContext.get(key)).to.be.throw;
    });

    it('should throw error when use function injection key and scope is TRANSIENT', async () => {
      const nestContainer = new NestContainer();
      const instanceLoader = new InstanceLoader(nestContainer);
      const module = await nestContainer.addModule(class T {}, []);

      const key = A;
      nestContainer.addProvider(
        {
          provide: key,
          useClass: A,
          scope: Scope.TRANSIENT,
        },
        module.token,
      );
      nestContainer.addInjectable(
        {
          provide: key,
          useClass: A,
          scope: Scope.TRANSIENT,
        },
        module.token,
      );

      instanceLoader.createInstancesOfDependencies(nestContainer.getModules());
      const applicationContext = new NestApplicationContext(nestContainer, []);

      expect(() => applicationContext.get(key)).to.be.throw;
    });

    it('should throw error when use string injection key and scope is TRANSIENT', async () => {
      const nestContainer = new NestContainer();
      const instanceLoader = new InstanceLoader(nestContainer);
      const module = await nestContainer.addModule(class T {}, []);

      const key = 'KEY_A';
      nestContainer.addProvider(
        {
          provide: key,
          useClass: A,
          scope: Scope.TRANSIENT,
        },
        module.token,
      );
      nestContainer.addInjectable(
        {
          provide: key,
          useClass: A,
          scope: Scope.TRANSIENT,
        },
        module.token,
      );

      instanceLoader.createInstancesOfDependencies(nestContainer.getModules());
      const applicationContext = new NestApplicationContext(nestContainer, []);

      expect(() => applicationContext.get(key)).to.be.throw;
    });

    it('should throw error when use symbol injection key and scope is TRANSIENT', async () => {
      const nestContainer = new NestContainer();
      const instanceLoader = new InstanceLoader(nestContainer);
      const module = await nestContainer.addModule(class T {}, []);

      const key = Symbol('KEY_A');
      nestContainer.addProvider(
        {
          provide: key,
          useClass: A,
          scope: Scope.TRANSIENT,
        },
        module.token,
      );
      nestContainer.addInjectable(
        {
          provide: key,
          useClass: A,
          scope: Scope.TRANSIENT,
        },
        module.token,
      );

      instanceLoader.createInstancesOfDependencies(nestContainer.getModules());
      const applicationContext = new NestApplicationContext(nestContainer, []);

      expect(() => applicationContext.get(key)).to.be.throw;
    });
  });

  describe('resolve', () => {
    it('should resolve value with function injection key when scope is DEFAULT', async () => {
      const nestContainer = new NestContainer();
      const instanceLoader = new InstanceLoader(nestContainer);
      const module = await nestContainer.addModule(class T {}, []);

      const key = A;
      nestContainer.addProvider(
        {
          provide: key,
          useClass: A,
          scope: Scope.DEFAULT,
        },
        module.token,
      );
      nestContainer.addInjectable(
        {
          provide: key,
          useClass: A,
          scope: Scope.DEFAULT,
        },
        module.token,
      );

      instanceLoader.createInstancesOfDependencies(nestContainer.getModules());
      const applicationContext = new NestApplicationContext(nestContainer, []);
      const a1: A = await applicationContext.resolve(key);
      const a2: A = await applicationContext.resolve(key);

      expect(a1).instanceOf(A);
      expect(a2).instanceOf(A);
      expect(a1).equal(a2);
    });

    it('should resolve value with string injection key when scope is DEFAULT', async () => {
      const nestContainer = new NestContainer();
      const instanceLoader = new InstanceLoader(nestContainer);
      const module = await nestContainer.addModule(class T {}, []);

      const key = 'KEY_A';
      nestContainer.addProvider(
        {
          provide: key,
          useClass: A,
          scope: Scope.DEFAULT,
        },
        module.token,
      );
      nestContainer.addInjectable(
        {
          provide: key,
          useClass: A,
          scope: Scope.DEFAULT,
        },
        module.token,
      );

      instanceLoader.createInstancesOfDependencies(nestContainer.getModules());
      const applicationContext = new NestApplicationContext(nestContainer, []);
      const a1: A = await applicationContext.resolve(key);
      const a2: A = await applicationContext.resolve(key);

      expect(a1).instanceOf(A);
      expect(a2).instanceOf(A);
      expect(a1).equal(a2);
    });

    it('should resolve value with symbol injection key when scope is DEFAULT', async () => {
      const nestContainer = new NestContainer();
      const instanceLoader = new InstanceLoader(nestContainer);
      const module = await nestContainer.addModule(class T {}, []);

      const key = Symbol('KEY_A');
      nestContainer.addProvider(
        {
          provide: key,
          useClass: A,
          scope: Scope.DEFAULT,
        },
        module.token,
      );
      nestContainer.addInjectable(
        {
          provide: key,
          useClass: A,
          scope: Scope.DEFAULT,
        },
        module.token,
      );

      instanceLoader.createInstancesOfDependencies(nestContainer.getModules());
      const applicationContext = new NestApplicationContext(nestContainer, []);
      const a1: A = await applicationContext.resolve(key);
      const a2: A = await applicationContext.resolve(key);

      expect(a1).instanceOf(A);
      expect(a2).instanceOf(A);
      expect(a1).equal(a2);
    });

    it('should resolve value with function injection key when scope is REQUEST', async () => {
      const nestContainer = new NestContainer();
      const instanceLoader = new InstanceLoader(nestContainer);
      const module = await nestContainer.addModule(class T {}, []);

      const key = A;
      nestContainer.addProvider(
        {
          provide: key,
          useClass: A,
          scope: Scope.REQUEST,
        },
        module.token,
      );
      nestContainer.addInjectable(
        {
          provide: key,
          useClass: A,
          scope: Scope.REQUEST,
        },
        module.token,
      );

      instanceLoader.createInstancesOfDependencies(nestContainer.getModules());
      const applicationContext = new NestApplicationContext(nestContainer, []);
      const a1: A = await applicationContext.resolve(key);
      const a2: A = await applicationContext.resolve(key);

      expect(a1).instanceOf(A);
      expect(a2).instanceOf(A);
      expect(a1).not.equal(a2);
    });

    it('should resolve value with string injection key when scope is REQUEST', async () => {
      const nestContainer = new NestContainer();
      const instanceLoader = new InstanceLoader(nestContainer);
      const module = await nestContainer.addModule(class T {}, []);

      const key = 'KEY_A';
      nestContainer.addProvider(
        {
          provide: key,
          useClass: A,
          scope: Scope.REQUEST,
        },
        module.token,
      );
      nestContainer.addInjectable(
        {
          provide: key,
          useClass: A,
          scope: Scope.REQUEST,
        },
        module.token,
      );

      instanceLoader.createInstancesOfDependencies(nestContainer.getModules());
      const applicationContext = new NestApplicationContext(nestContainer, []);
      const a1: A = await applicationContext.resolve(key);
      const a2: A = await applicationContext.resolve(key);

      expect(a1).instanceOf(A);
      expect(a2).instanceOf(A);
      expect(a1).not.equal(a2);
    });

    it('should resolve value with symbol injection key when scope is REQUEST', async () => {
      const nestContainer = new NestContainer();
      const instanceLoader = new InstanceLoader(nestContainer);
      const module = await nestContainer.addModule(class T {}, []);

      const key = Symbol('KEY_A');
      nestContainer.addProvider(
        {
          provide: key,
          useClass: A,
          scope: Scope.REQUEST,
        },
        module.token,
      );
      nestContainer.addInjectable(
        {
          provide: key,
          useClass: A,
          scope: Scope.REQUEST,
        },
        module.token,
      );

      instanceLoader.createInstancesOfDependencies(nestContainer.getModules());
      const applicationContext = new NestApplicationContext(nestContainer, []);
      const a1: A = await applicationContext.resolve(key);
      const a2: A = await applicationContext.resolve(key);

      expect(a1).instanceOf(A);
      expect(a2).instanceOf(A);
      expect(a1).not.equal(a2);
    });

    it('should resolve value with function injection key when scope is TRANSIENT', async () => {
      const nestContainer = new NestContainer();
      const instanceLoader = new InstanceLoader(nestContainer);
      const module = await nestContainer.addModule(class T {}, []);

      const key = A;
      nestContainer.addProvider(
        {
          provide: key,
          useClass: A,
          scope: Scope.TRANSIENT,
        },
        module.token,
      );
      nestContainer.addInjectable(
        {
          provide: key,
          useClass: A,
          scope: Scope.TRANSIENT,
        },
        module.token,
      );

      instanceLoader.createInstancesOfDependencies(nestContainer.getModules());
      const applicationContext = new NestApplicationContext(nestContainer, []);
      const a1: A = await applicationContext.resolve(key);
      const a2: A = await applicationContext.resolve(key);

      expect(a1).instanceOf(A);
      expect(a2).instanceOf(A);
      expect(a1).not.equal(a2);
    });

    it('should resolve value with string injection key when scope is TRANSIENT', async () => {
      const nestContainer = new NestContainer();
      const instanceLoader = new InstanceLoader(nestContainer);
      const module = await nestContainer.addModule(class T {}, []);

      const key = 'KEY_A';
      nestContainer.addProvider(
        {
          provide: key,
          useClass: A,
          scope: Scope.TRANSIENT,
        },
        module.token,
      );
      nestContainer.addInjectable(
        {
          provide: key,
          useClass: A,
          scope: Scope.TRANSIENT,
        },
        module.token,
      );

      instanceLoader.createInstancesOfDependencies(nestContainer.getModules());
      const applicationContext = new NestApplicationContext(nestContainer, []);
      const a1: A = await applicationContext.resolve(key);
      const a2: A = await applicationContext.resolve(key);

      expect(a1).instanceOf(A);
      expect(a2).instanceOf(A);
      expect(a1).not.equal(a2);
    });

    it('should resolve value with symbol injection key when scope is TRANSIENT', async () => {
      const nestContainer = new NestContainer();
      const instanceLoader = new InstanceLoader(nestContainer);
      const module = await nestContainer.addModule(class T {}, []);

      const key = Symbol('KEY_A');
      nestContainer.addProvider(
        {
          provide: key,
          useClass: A,
          scope: Scope.TRANSIENT,
        },
        module.token,
      );
      nestContainer.addInjectable(
        {
          provide: key,
          useClass: A,
          scope: Scope.TRANSIENT,
        },
        module.token,
      );

      instanceLoader.createInstancesOfDependencies(nestContainer.getModules());
      const applicationContext = new NestApplicationContext(nestContainer, []);
      const a1: A = await applicationContext.resolve(key);
      const a2: A = await applicationContext.resolve(key);

      expect(a1).instanceOf(A);
      expect(a2).instanceOf(A);
      expect(a1).not.equal(a2);
    });
  });
});
