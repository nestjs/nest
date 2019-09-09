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
    await app.listen(3000);
    const instance = module.get(TestInjectable);
    expect(instance.onApplicationBootstrap.called).to.be.true;
    await app.close();
  });

  it('should not throw an error when onApplicationBootstrap is null', async () => {
    const module = await Test.createTestingModule({
      providers: [
        { provide: 'TEST', useValue: { onApplicationBootstrap: null } }
      ],
    }).compile();

    const app = module.createNestApplication();
    await app.listen(3000).then((obj) => expect(obj).to.not.be.undefined);
    await app.close();
  });

  it('should not throw an error when onApplicationBootstrap is undefined', async () => {
    const module = await Test.createTestingModule({
      providers: [
        { provide: 'TEST', useValue: { onApplicationBootstrap: undefined } }
      ],
    }).compile();

    const app = module.createNestApplication();
    await app.listen(3000).then((obj) => expect(obj).to.not.be.undefined);
    await app.close();
  });
});
