import { Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as Sinon from 'sinon';

@Injectable()
class TestInjectable implements OnApplicationShutdown {
  onApplicationShutdown = Sinon.spy();
}

describe('OnApplicationShutdown', () => {
  it('should call onApplicationShutdown when application closes', async () => {
    const module = await Test.createTestingModule({
      providers: [TestInjectable],
    }).compile();

    const app = module.createNestApplication();
    await app.close();
    const instance = module.get(TestInjectable);
    expect(instance.onApplicationShutdown.called).to.be.true;
  });

  it('should sort modules by distance (topological sort) - ASC order', async () => {
    const order: string[] = [];

    @Injectable()
    class BB implements OnApplicationShutdown {
      async onApplicationShutdown() {
        order.push('BB');
      }
    }

    @Module({
      providers: [BB],
      exports: [BB],
    })
    class B {}

    @Injectable()
    class AA implements OnApplicationShutdown {
      async onApplicationShutdown() {
        order.push('AA');
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
    await app.close();

    expect(order).to.be.deep.equal(['AA', 'BB']);
  });
});
