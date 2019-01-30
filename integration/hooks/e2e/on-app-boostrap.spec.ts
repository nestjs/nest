import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as Sinon from 'sinon';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';

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
});
