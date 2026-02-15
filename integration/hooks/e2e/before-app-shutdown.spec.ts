import { BeforeApplicationShutdown, Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
@Injectable()
class TestInjectable implements BeforeApplicationShutdown {
  beforeApplicationShutdown = vi.fn();
}

describe('BeforeApplicationShutdown', () => {
  it('should call `beforeApplicationShutdown` when application closes', async () => {
    const module = await Test.createTestingModule({
      providers: [TestInjectable],
    }).compile();

    const app = module.createNestApplication();
    await app.close();
    const instance = module.get(TestInjectable);
    expect(instance.beforeApplicationShutdown).toHaveBeenCalled();
  });

  it('should sort modules by distance (topological sort) - DESC order', async () => {
    @Injectable()
    class BB implements BeforeApplicationShutdown {
      beforeApplicationShutdown = vi.fn();
    }

    @Module({
      providers: [BB],
      exports: [BB],
    })
    class B {}

    @Injectable()
    class AA implements BeforeApplicationShutdown {
      constructor(private bb: BB) {}
      beforeApplicationShutdown = vi.fn();
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
    expect(
      aa.beforeApplicationShutdown.mock.invocationCallOrder[0],
    ).toBeLessThan(bb.beforeApplicationShutdown.mock.invocationCallOrder[0]);
  });
});
