import { Injectable, Module, OnApplicationBootstrap } from '@nestjs/common';
import { Test } from '@nestjs/testing';
@Injectable()
class TestInjectable implements OnApplicationBootstrap {
  onApplicationBootstrap = vi.fn();
}

describe('OnApplicationBootstrap', () => {
  it('should call onApplicationBootstrap when application starts', async () => {
    const module = await Test.createTestingModule({
      providers: [TestInjectable],
    }).compile();

    const app = module.createNestApplication();
    await app.init();
    const instance = module.get(TestInjectable);
    expect(instance.onApplicationBootstrap).toHaveBeenCalled();
    await app.close();
  });

  it('should not throw an error when onApplicationBootstrap is null', async () => {
    const module = await Test.createTestingModule({
      providers: [
        { provide: 'TEST', useValue: { onApplicationBootstrap: null } },
      ],
    }).compile();

    const app = module.createNestApplication();
    await app.init().then(obj => expect(obj).not.toBeUndefined());
    await app.close();
  });

  it('should not throw an error when onApplicationBootstrap is undefined', async () => {
    const module = await Test.createTestingModule({
      providers: [
        { provide: 'TEST', useValue: { onApplicationBootstrap: undefined } },
      ],
    }).compile();

    const app = module.createNestApplication();
    await app.init().then(obj => expect(obj).not.toBeUndefined());
    await app.close();
  });

  it('should sort modules by distance (topological sort) - DESC order', async () => {
    @Injectable()
    class BB implements OnApplicationBootstrap {
      public field: string;
      async onApplicationBootstrap() {
        this.field = 'b-field';
      }
    }

    @Module({
      providers: [BB],
      exports: [BB],
    })
    class B {}

    @Injectable()
    class AA implements OnApplicationBootstrap {
      public field: string;
      constructor(private bb: BB) {}

      async onApplicationBootstrap() {
        this.field = this.bb.field + '_a-field';
      }
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

    const instance = module.get(AA);
    expect(instance.field).toBe('b-field_a-field');
    await app.close();
  });

  it('should sort components within a single module by injection hierarchy - DESC order', async () => {
    @Injectable()
    class A implements OnApplicationBootstrap {
      onApplicationBootstrap = vi.fn();
    }

    @Injectable()
    class AHost implements OnApplicationBootstrap {
      constructor(private a: A) {}
      onApplicationBootstrap = vi.fn();
    }

    @Injectable()
    class Composition implements OnApplicationBootstrap {
      constructor(
        private a: A,
        private host: AHost,
      ) {}
      onApplicationBootstrap = vi.fn();
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

    expect(child.onApplicationBootstrap).toHaveBeenCalledBefore(
      parent.onApplicationBootstrap,
    );
    expect(parent.onApplicationBootstrap).toHaveBeenCalledBefore(
      composition.onApplicationBootstrap,
    );
  });
});
