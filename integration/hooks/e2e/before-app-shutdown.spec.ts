import { Injectable, BeforeApplicationShutdown } from '@nestjs/common';
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

  it('should not stop the server once beforeApplicationShutdown has been called', async () => {
    let resolve;
    const promise = new Promise(r => (resolve = r));
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: 'Test',
          useValue: {
            beforeApplicationShutdown: () => promise,
          },
        },
      ],
    }).compile();
    Sinon.stub(module, 'dispose' as any);
    const app = module.createNestApplication();

    app.close();

    expect(((module as any).dispose as Sinon.SinonSpy).called, 'dispose').to.be
      .false;

    resolve();

    setTimeout(
      () =>
        expect(((module as any).dispose as Sinon.SinonSpy).called, 'dispose').to
          .be.true,
      0,
    );
  });
});
