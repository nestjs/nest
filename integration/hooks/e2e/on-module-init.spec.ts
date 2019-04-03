import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as Sinon from 'sinon';
import { Injectable, OnModuleInit } from '@nestjs/common';

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
});
