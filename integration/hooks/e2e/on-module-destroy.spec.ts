import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as Sinon from 'sinon';
import { Injectable, OnModuleDestroy } from '@nestjs/common';

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
});
