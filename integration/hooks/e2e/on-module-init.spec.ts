import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as Sinon from 'sinon';

@Injectable()
class TestInjectable implements OnModuleInit {
  onModuleInit = Sinon.spy();
}

describe('OnModuleInit', () => {
  it('should call onModuleInit when application starts', async () => {
    const module = await Test.createTestingModule({
      providers: [TestInjectable],
    }).compile();

    const app = module.createNestApplication();
    await app.init();
    const instance = module.get(TestInjectable);
    expect(instance.onModuleInit.called).to.be.true;
  });

  it('should not throw an error when onModuleInit is null', async () => {
    const module = await Test.createTestingModule({
      providers: [{ provide: 'TEST', useValue: { onModuleInit: null } }],
    }).compile();

    const app = module.createNestApplication();
    await app.init().then(obj => expect(obj).to.not.be.undefined);
  });

  it('should not throw an error when onModuleInit is undefined', async () => {
    const module = await Test.createTestingModule({
      providers: [{ provide: 'TEST', useValue: { onModuleInit: undefined } }],
    }).compile();

    const app = module.createNestApplication();
    await app.init().then(obj => expect(obj).to.not.be.undefined);
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
    expect(instance.field).to.equal('c-field_b-field_a-field');
  });
});
