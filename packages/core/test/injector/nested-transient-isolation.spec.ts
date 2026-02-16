import { Scope } from '@nestjs/common';
import { expect } from 'chai';
import { Injectable } from '../../../common/decorators/core/injectable.decorator';
import { NestContainer } from '../../injector/container';
import { Injector } from '../../injector/injector';
import { InstanceWrapper } from '../../injector/instance-wrapper';
import { Module } from '../../injector/module';

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

      await injector.loadInstance(
        parent1Wrapper,
        module.providers,
        module,
        contextId,
      );
      await injector.loadInstance(
        parent2Wrapper,
        module.providers,
        module,
        contextId,
      );

      const parent1Instance =
        parent1Wrapper.getInstanceByContextId(contextId).instance;
      const parent2Instance =
        parent2Wrapper.getInstanceByContextId(contextId).instance;

      // 각 parent는 서로 다른 TransientService instance를 가져야 함
      expect(parent1Instance.transient.instanceId).to.not.equal(
        parent2Instance.transient.instanceId,
      );
    });

    it('should create separate nested TRANSIENT instances for each parent TRANSIENT', async () => {
      const contextId = { id: 1 };

      await injector.loadInstance(
        parent1Wrapper,
        module.providers,
        module,
        contextId,
      );
      await injector.loadInstance(
        parent2Wrapper,
        module.providers,
        module,
        contextId,
      );

      const parent1Instance =
        parent1Wrapper.getInstanceByContextId(contextId).instance;
      const parent2Instance =
        parent2Wrapper.getInstanceByContextId(contextId).instance;

      // 각 TransientService는 서로 다른 NestedTransientService instance를 가져야 함
      expect(parent1Instance.transient.nested.instanceId).to.not.equal(
        parent2Instance.transient.nested.instanceId,
      );
    });

    it('should maintain isolation across multiple request contexts', async () => {
      const contextId1 = { id: 1 };
      const contextId2 = { id: 2 };

      await injector.loadInstance(
        parent1Wrapper,
        module.providers,
        module,
        contextId1,
      );
      await injector.loadInstance(
        parent2Wrapper,
        module.providers,
        module,
        contextId1,
      );
      await injector.loadInstance(
        parent1Wrapper,
        module.providers,
        module,
        contextId2,
      );

      const ctx1Parent1 =
        parent1Wrapper.getInstanceByContextId(contextId1).instance;
      const ctx1Parent2 =
        parent2Wrapper.getInstanceByContextId(contextId1).instance;
      const ctx2Parent1 =
        parent1Wrapper.getInstanceByContextId(contextId2).instance;

      // 같은 context 내에서 다른 parent
      expect(ctx1Parent1.transient.nested.instanceId).to.not.equal(
        ctx1Parent2.transient.nested.instanceId,
      );

      // 다른 context의 같은 parent
      expect(ctx1Parent1.transient.nested.instanceId).to.not.equal(
        ctx2Parent1.transient.nested.instanceId,
      );
    });
  });

  describe('when DEFAULT scoped provider depends on nested TRANSIENT chain', () => {
    @Injectable({ scope: Scope.TRANSIENT })
    class NestedTransientService {
      public static constructorCalled = false;
      public readonly value = 'nested-initialized';

      constructor() {
        NestedTransientService.constructorCalled = true;
      }
    }

    @Injectable({ scope: Scope.TRANSIENT })
    class TransientService {
      public static constructorCalled = false;

      constructor(public readonly nested: NestedTransientService) {
        TransientService.constructorCalled = true;
      }
    }

    @Injectable()
    class DefaultScopedParent {
      constructor(public readonly transient: TransientService) {}
    }

    let nestedTransientWrapper: InstanceWrapper;
    let transientWrapper: InstanceWrapper;
    let parentWrapper: InstanceWrapper;

    beforeEach(() => {
      NestedTransientService.constructorCalled = false;
      TransientService.constructorCalled = false;

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

      module.providers.set(NestedTransientService, nestedTransientWrapper);
      module.providers.set(TransientService, transientWrapper);
      module.providers.set(DefaultScopedParent, parentWrapper);
    });

    it('should instantiate nested TRANSIENT providers from DEFAULT scope', async () => {
      await injector.loadInstance(parentWrapper, module.providers, module);

      const parentInstance = parentWrapper.instance;

      expect(TransientService.constructorCalled).to.be.true;
      expect(NestedTransientService.constructorCalled).to.be.true;
      expect(parentInstance.transient).to.be.instanceOf(TransientService);
      expect(parentInstance.transient.nested).to.be.instanceOf(
        NestedTransientService,
      );
      expect(parentInstance.transient.nested.value).to.equal(
        'nested-initialized',
      );
    });
  });
});
