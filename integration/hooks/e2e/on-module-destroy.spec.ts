import { Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as Sinon from 'sinon';

@Injectable()
class TestInjectable implements OnModuleDestroy {
  onModuleDestroy = Sinon.spy();
}

describe('OnModuleDestroy', () => {
  it('should call onModuleDestroy when application closes', async () => {
    const module = await Test.createTestingModule({
      providers: [TestInjectable],
    }).compile();

    const app = module.createNestApplication();
    await app.close();
    const instance = module.get(TestInjectable);
    expect(instance.onModuleDestroy.called).to.be.true;
  });

  it('should not throw an error when onModuleDestroy is null', async () => {
    const module = await Test.createTestingModule({
      providers: [{ provide: 'TEST', useValue: { onModuleDestroy: null } }],
    }).compile();

    const app = module.createNestApplication();
    await app.init().then(obj => expect(obj).to.not.be.undefined);
  });

  it('should not throw an error when onModuleDestroy is undefined', async () => {
    const module = await Test.createTestingModule({
      providers: [
        { provide: 'TEST', useValue: { onModuleDestroy: undefined } },
      ],
    }).compile();

    const app = module.createNestApplication();
    await app.init().then(obj => expect(obj).to.not.be.undefined);
  });

  it('should sort modules by distance (topological sort) - DESC order', async () => {
    @Injectable()
    class BB implements OnModuleDestroy {
      onModuleDestroy = Sinon.spy();
    }

    @Module({
      providers: [BB],
      exports: [BB],
    })
    class B {}

    @Injectable()
    class AA implements OnModuleDestroy {
      constructor(private bb: BB) {}
      onModuleDestroy = Sinon.spy();
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
    Sinon.assert.callOrder(aa.onModuleDestroy, bb.onModuleDestroy);
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
