import { Scope } from '@nestjs/common';
import { Injectable } from '../../../common/decorators/core/injectable.decorator.js';
import { NestContainer } from '../../injector/container.js';
import { Injector } from '../../injector/injector.js';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';
import { Module } from '../../injector/module.js';

describe('Nested Transient Isolation', () => {
  let injector: Injector;
  let module: Module;

  beforeEach(() => {
    injector = new Injector();
    module = new Module(class TestModule {}, new NestContainer());
  });

  describe('when TRANSIENT provider depends on another TRANSIENT provider', () => {
    @Injectable({ scope: Scope.TRANSIENT })
    class NestedTransientService {
      public static instanceCount = 0;
      public readonly instanceId: number;

      constructor() {
        NestedTransientService.instanceCount++;
        this.instanceId = NestedTransientService.instanceCount;
      }
    }

    @Injectable({ scope: Scope.TRANSIENT })
    class TransientService {
      public static instanceCount = 0;
      public readonly instanceId: number;

      constructor(public readonly nested: NestedTransientService) {
        TransientService.instanceCount++;
        this.instanceId = TransientService.instanceCount;
      }
    }

    @Injectable({ scope: Scope.REQUEST })
    class RequestScopedParent1 {
      constructor(public readonly transient: TransientService) {}
    }

    @Injectable({ scope: Scope.REQUEST })
    class RequestScopedParent2 {
      constructor(public readonly transient: TransientService) {}
    }

    let nestedTransientWrapper: InstanceWrapper;
    let transientWrapper: InstanceWrapper;
    let parent1Wrapper: InstanceWrapper;
    let parent2Wrapper: InstanceWrapper;

    beforeEach(() => {
      NestedTransientService.instanceCount = 0;
      TransientService.instanceCount = 0;

      nestedTransientWrapper = new InstanceWrapper({
        name: NestedTransientService.name,
        token: NestedTransientService,
        metatype: NestedTransientService,
        scope: Scope.TRANSIENT,
        host: module,
      });

      transientWrapper = new InstanceWrapper({
        name: TransientService.name,
        token: TransientService,
        metatype: TransientService,
        scope: Scope.TRANSIENT,
        host: module,
      });

      parent1Wrapper = new InstanceWrapper({
        name: RequestScopedParent1.name,
        token: RequestScopedParent1,
        metatype: RequestScopedParent1,
        scope: Scope.REQUEST,
        host: module,
      });

      parent2Wrapper = new InstanceWrapper({
        name: RequestScopedParent2.name,
        token: RequestScopedParent2,
        metatype: RequestScopedParent2,
        scope: Scope.REQUEST,
        host: module,
      });

      module.providers.set(NestedTransientService, nestedTransientWrapper);
      module.providers.set(TransientService, transientWrapper);
      module.providers.set(RequestScopedParent1, parent1Wrapper);
      module.providers.set(RequestScopedParent2, parent2Wrapper);
    });

    it('should create separate TRANSIENT instances for each parent', async () => {
      const contextId = { id: 1 };

      await injector.loadInstance(parent1Wrapper, module.providers, module, {
        contextId,
      });
      await injector.loadInstance(parent2Wrapper, module.providers, module, {
        contextId,
      });

      const parent1Instance =
        parent1Wrapper.getInstanceByContextId(contextId).instance;
      const parent2Instance =
        parent2Wrapper.getInstanceByContextId(contextId).instance;

      // 각 parent는 서로 다른 TransientService instance를 가져야 함
      expect(parent1Instance.transient.instanceId).not.toBe(
        parent2Instance.transient.instanceId,
      );
    });

    it('should create separate nested TRANSIENT instances for each parent TRANSIENT', async () => {
      const contextId = { id: 1 };

      await injector.loadInstance(parent1Wrapper, module.providers, module, {
        contextId,
      });
      await injector.loadInstance(parent2Wrapper, module.providers, module, {
        contextId,
      });

      const parent1Instance =
        parent1Wrapper.getInstanceByContextId(contextId).instance;
      const parent2Instance =
        parent2Wrapper.getInstanceByContextId(contextId).instance;

      // 각 TransientService는 서로 다른 NestedTransientService instance를 가져야 함
      expect(parent1Instance.transient.nested.instanceId).not.toBe(
        parent2Instance.transient.nested.instanceId,
      );
    });

    it('should maintain isolation across multiple request contexts', async () => {
      const contextId1 = { id: 1 };
      const contextId2 = { id: 2 };

      await injector.loadInstance(parent1Wrapper, module.providers, module, {
        contextId: contextId1,
      });
      await injector.loadInstance(parent2Wrapper, module.providers, module, {
        contextId: contextId1,
      });
      await injector.loadInstance(parent1Wrapper, module.providers, module, {
        contextId: contextId2,
      });

      const ctx1Parent1 =
        parent1Wrapper.getInstanceByContextId(contextId1).instance;
      const ctx1Parent2 =
        parent2Wrapper.getInstanceByContextId(contextId1).instance;
      const ctx2Parent1 =
        parent1Wrapper.getInstanceByContextId(contextId2).instance;

      // 같은 context 내에서 다른 parent
      expect(ctx1Parent1.transient.nested.instanceId).not.toBe(
        ctx1Parent2.transient.nested.instanceId,
      );

      // 다른 context의 같은 parent
      expect(ctx1Parent1.transient.nested.instanceId).not.toBe(
        ctx2Parent1.transient.nested.instanceId,
      );
    });
  });

  describe('when DEFAULT scoped provider depends on nested TRANSIENT chain', () => {
    @Injectable({ scope: Scope.TRANSIENT })
    class NestedTransientService {
      public static constructorCalled = false;
      public static instanceCount = 0;
      public readonly instanceId: number;
      public readonly value = 'nested-initialized';

      constructor() {
        NestedTransientService.constructorCalled = true;
        NestedTransientService.instanceCount++;
        this.instanceId = NestedTransientService.instanceCount;
      }
    }

    @Injectable({ scope: Scope.TRANSIENT })
    class TransientService {
      public static constructorCalled = false;
      public static instanceCount = 0;
      public readonly instanceId: number;

      constructor(public readonly nested: NestedTransientService) {
        TransientService.constructorCalled = true;
        TransientService.instanceCount++;
        this.instanceId = TransientService.instanceCount;
      }
    }

    @Injectable()
    class DefaultScopedParent {
      constructor(public readonly transient: TransientService) {}
    }

    @Injectable()
    class DefaultScopedParent2 {
      constructor(public readonly transient: TransientService) {}
    }

    let nestedTransientWrapper: InstanceWrapper;
    let transientWrapper: InstanceWrapper;
    let parentWrapper: InstanceWrapper;
    let parent2Wrapper: InstanceWrapper;

    beforeEach(() => {
      NestedTransientService.constructorCalled = false;
      NestedTransientService.instanceCount = 0;
      TransientService.constructorCalled = false;
      TransientService.instanceCount = 0;

      nestedTransientWrapper = new InstanceWrapper({
        name: NestedTransientService.name,
        token: NestedTransientService,
        metatype: NestedTransientService,
        scope: Scope.TRANSIENT,
        host: module,
      });

      transientWrapper = new InstanceWrapper({
        name: TransientService.name,
        token: TransientService,
        metatype: TransientService,
        scope: Scope.TRANSIENT,
        host: module,
      });

      parentWrapper = new InstanceWrapper({
        name: DefaultScopedParent.name,
        token: DefaultScopedParent,
        metatype: DefaultScopedParent,
        scope: Scope.DEFAULT,
        host: module,
      });

      parent2Wrapper = new InstanceWrapper({
        name: DefaultScopedParent2.name,
        token: DefaultScopedParent2,
        metatype: DefaultScopedParent2,
        scope: Scope.DEFAULT,
        host: module,
      });

      module.providers.set(NestedTransientService, nestedTransientWrapper);
      module.providers.set(TransientService, transientWrapper);
      module.providers.set(DefaultScopedParent, parentWrapper);
      module.providers.set(DefaultScopedParent2, parent2Wrapper);
    });

    it('should instantiate nested TRANSIENT providers from DEFAULT scope', async () => {
      await injector.loadInstance(parentWrapper, module.providers, module);

      const parentInstance = parentWrapper.instance;

      expect(TransientService.constructorCalled).toBe(true);
      expect(NestedTransientService.constructorCalled).toBe(true);
      expect(parentInstance.transient).toBeInstanceOf(TransientService);
      expect(parentInstance.transient.nested).toBeInstanceOf(
        NestedTransientService,
      );
      expect(parentInstance.transient.nested.value).toBe('nested-initialized');
    });

    it('should isolate nested TRANSIENT instances across DEFAULT parents in STATIC context', async () => {
      await injector.loadInstance(parentWrapper, module.providers, module);
      await injector.loadInstance(parent2Wrapper, module.providers, module);

      const parent1Instance = parentWrapper.instance;
      const parent2Instance = parent2Wrapper.instance;

      expect(parent1Instance.transient.instanceId).to.not.equal(
        parent2Instance.transient.instanceId,
      );
      expect(parent1Instance.transient.nested.instanceId).to.not.equal(
        parent2Instance.transient.nested.instanceId,
      );
    });
  });
});
