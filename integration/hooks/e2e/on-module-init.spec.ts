import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import { Test } from '@nestjs/testing';
@Injectable()
class TestInjectable implements OnModuleInit {
  onModuleInit = vi.fn();
}

describe('OnModuleInit', () => {
  it('should call onModuleInit when application starts', async () => {
    const module = await Test.createTestingModule({
      providers: [TestInjectable],
    }).compile();

    const app = module.createNestApplication();
    await app.init();
    const instance = module.get(TestInjectable);
    expect(instance.onModuleInit).toHaveBeenCalled();
    await app.close();
  });

  it('should not throw an error when onModuleInit is null', async () => {
    const module = await Test.createTestingModule({
      providers: [{ provide: 'TEST', useValue: { onModuleInit: null } }],
    }).compile();

    const app = module.createNestApplication();
    await app.init().then(obj => expect(obj).not.toBeUndefined());
    await app.close();
  });

  it('should not throw an error when onModuleInit is undefined', async () => {
    const module = await Test.createTestingModule({
      providers: [{ provide: 'TEST', useValue: { onModuleInit: undefined } }],
    }).compile();

    const app = module.createNestApplication();
    await app.init().then(obj => expect(obj).not.toBeUndefined());
    await app.close();
  });

  it('should sort modules by distance (topological sort) - DESC order', async () => {
    @Injectable()
    class CC implements OnModuleInit {
      public field: string;

      async onModuleInit() {
        this.field = 'c-field';
      }
    }

    @Module({})
    class C {
      static forRoot() {
        return {
          module: C,
          global: true,
          providers: [
            {
              provide: CC,
              useValue: new CC(),
            },
          ],
          exports: [CC],
        };
      }
    }

    @Injectable()
    class BB implements OnModuleInit {
      public field: string;
      constructor(private cc: CC) {}

      async onModuleInit() {
        this.field = this.cc.field + '_b-field';
      }
    }

    @Module({
      providers: [BB],
      exports: [BB],
    })
    class B {}

    @Injectable()
    class AA implements OnModuleInit {
      public field: string;
      constructor(private bb: BB) {}

      async onModuleInit() {
        this.field = this.bb.field + '_a-field';
      }
    }
    @Module({
      imports: [B],
      providers: [AA],
    })
    class A {}

    @Module({
      imports: [A, C.forRoot()],
    })
    class AppModule {}

    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = module.createNestApplication();
    await app.init();

    const instance = module.get(AA);
    expect(instance.field).toBe('c-field_b-field_a-field');
    await app.close();
  });

  it('should sort components within a single module by injection hierarchy - DESC order', async () => {
    @Injectable()
    class A implements OnModuleInit {
      onModuleInit = Sinon.spy();
    }

    @Injectable()
    class AHost implements OnModuleInit {
      constructor(private a: A) {}
      onModuleInit = Sinon.spy();
    }

    @Injectable()
    class Composition implements OnModuleInit {
      constructor(
        private a: A,
        private host: AHost,
      ) {}
      onModuleInit = Sinon.spy();
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
      child.onModuleInit,
      parent.onModuleInit,
      composition.onModuleInit,
    );
  });
});
