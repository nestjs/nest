import { Injectable, Module, OnApplicationBootstrap } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as Sinon from 'sinon';

@Injectable()
class TestInjectable implements OnApplicationBootstrap {
  onApplicationBootstrap = Sinon.spy();
}

describe('OnApplicationBootstrap', () => {
  it('should call onApplicationBootstrap when application starts', async () => {
    const module = await Test.createTestingModule({
      providers: [TestInjectable],
    }).compile();

    const app = module.createNestApplication();
    await app.init();
    const instance = module.get(TestInjectable);
    expect(instance.onApplicationBootstrap.called).to.be.true;
  });

  it('should not throw an error when onApplicationBootstrap is null', async () => {
    const module = await Test.createTestingModule({
      providers: [
        { provide: 'TEST', useValue: { onApplicationBootstrap: null } },
      ],
    }).compile();

    const app = module.createNestApplication();
    await app.init().then(obj => expect(obj).to.not.be.undefined);
  });

  it('should not throw an error when onApplicationBootstrap is undefined', async () => {
    const module = await Test.createTestingModule({
      providers: [
        { provide: 'TEST', useValue: { onApplicationBootstrap: undefined } },
      ],
    }).compile();

    const app = module.createNestApplication();
    await app.init().then(obj => expect(obj).to.not.be.undefined);
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
    expect(instance.field).to.equal('b-field_a-field');
  });
});
