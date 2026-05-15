import {
  BeforeApplicationShutdown,
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

@Injectable()
class TestInjectable
  implements
    OnApplicationBootstrap,
    OnModuleInit,
    OnModuleDestroy,
    OnApplicationShutdown,
    BeforeApplicationShutdown
{
  onApplicationBootstrap = vi.fn();
  beforeApplicationShutdown = vi.fn();
  onApplicationShutdown = vi.fn();
  onModuleDestroy = vi.fn();
  onModuleInit = vi.fn();
}

describe('Lifecycle Hook Order', () => {
  it('should call the lifecycle hooks in the correct order', async () => {
    const module = await Test.createTestingModule({
      providers: [TestInjectable],
    }).compile();

    const app = module.createNestApplication();
    await app.init();
    await app.close();

    const instance = module.get(TestInjectable);
    const order = [
      instance.onModuleInit,
      instance.onApplicationBootstrap,
      instance.onModuleDestroy,
      instance.beforeApplicationShutdown,
      instance.onApplicationShutdown,
    ];
    for (let i = 0; i < order.length - 1; i++) {
      expect(order[i].mock.invocationCallOrder[0]).toBeLessThan(
        order[i + 1].mock.invocationCallOrder[0],
      );
    }
  });
});
