import { Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { Test } from '@nestjs/testing';
@Injectable()
class TestInjectable implements OnModuleDestroy {
  onModuleDestroy = vi.fn();
}

describe('OnModuleDestroy', () => {
  it('should call onModuleDestroy when application closes', async () => {
    const module = await Test.createTestingModule({
      providers: [TestInjectable],
    }).compile();

    const app = module.createNestApplication();
    await app.close();
    const instance = module.get(TestInjectable);
    expect(instance.onModuleDestroy).toHaveBeenCalled();
  });

  it('should not throw an error when onModuleDestroy is null', async () => {
    const module = await Test.createTestingModule({
      providers: [{ provide: 'TEST', useValue: { onModuleDestroy: null } }],
    }).compile();

    const app = module.createNestApplication();
    await app.init().then(obj => expect(obj).not.toBeUndefined());
    await app.close();
  });

  it('should not throw an error when onModuleDestroy is undefined', async () => {
    const module = await Test.createTestingModule({
      providers: [
        { provide: 'TEST', useValue: { onModuleDestroy: undefined } },
      ],
    }).compile();

    const app = module.createNestApplication();
    await app.init().then(obj => expect(obj).not.toBeUndefined());
    await app.close();
  });

  it('should sort modules by distance (topological sort) - DESC order', async () => {
    @Injectable()
    class BB implements OnModuleDestroy {
      onModuleDestroy = vi.fn();
    }

    @Module({
      providers: [BB],
      exports: [BB],
    })
    class B {}

    @Injectable()
    class AA implements OnModuleDestroy {
      constructor(private bb: BB) {}
      onModuleDestroy = vi.fn();
    }

    @Module({
      imports: [B],
      providers: [AA],
    })
    class A {}

    const module = await Test.createTestingModule({
      imports: [A],
    }).compile();

    const app = module.createNestApplication();
    await app.init();
    await app.close();

    const aa = module.get(AA);
    const bb = module.get(BB);
    expect(aa.onModuleDestroy.mock.invocationCallOrder[0]).toBeLessThan(
      bb.onModuleDestroy.mock.invocationCallOrder[0],
    );
  });

  it('should sort components within a single module by injection hierarchy - ASC order', async () => {
    @Injectable()
    class A implements OnModuleDestroy {
      onModuleDestroy = Sinon.spy();
    }

    @Injectable()
    class AHost implements OnModuleDestroy {
      constructor(private a: A) {}
      onModuleDestroy = Sinon.spy();
    }

    @Injectable()
    class Composition implements OnModuleDestroy {
      constructor(
        private a: A,
        private host: AHost,
      ) {}
      onModuleDestroy = Sinon.spy();
    }

    @Module({
      providers: [AHost, A, Composition],
    })
    class AModule {}

    const module = await Test.createTestingModule({
      imports: [AModule],
    }).compile();

    const app = module.createNestApplication();
    await app.init();
    await app.close();

    const child = module.get(A);
    const parent = module.get(AHost);
    const composition = module.get(Composition);
    Sinon.assert.callOrder(
      composition.onModuleDestroy,
      parent.onModuleDestroy,
      child.onModuleDestroy,
    );
  });
});
