import { BeforeApplicationShutdown, Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as Sinon from 'sinon';

@Injectable()
class TestInjectable implements BeforeApplicationShutdown {
  beforeApplicationShutdown = Sinon.spy();
}

describe('BeforeApplicationShutdown', () => {
  it('should call `beforeApplicationShutdown` when application closes', async () => {
    const module = await Test.createTestingModule({
      providers: [TestInjectable],
    }).compile();

    const app = module.createNestApplication();
    await app.close();
    const instance = module.get(TestInjectable);
    expect(instance.beforeApplicationShutdown.called).to.be.true;
  });

  it('should sort modules by distance (topological sort) - DESC order', async () => {
    @Injectable()
    class BB implements BeforeApplicationShutdown {
      beforeApplicationShutdown = Sinon.spy();
    }

    @Module({
      providers: [BB],
      exports: [BB],
    })
    class B {}

    @Injectable()
    class AA implements BeforeApplicationShutdown {
      constructor(private bb: BB) {}
      beforeApplicationShutdown = Sinon.spy();
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
    Sinon.assert.callOrder(
      aa.beforeApplicationShutdown,
      bb.beforeApplicationShutdown,
    );
  });
});
