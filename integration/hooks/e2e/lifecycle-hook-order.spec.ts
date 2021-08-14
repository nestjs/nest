import { Test } from '@nestjs/testing';
import * as Sinon from 'sinon';
import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  OnModuleDestroy,
  OnModuleInit,
  BeforeApplicationShutdown,
} from '@nestjs/common';

@Injectable()
class TestInjectable
  implements
    OnApplicationBootstrap,
    OnModuleInit,
    OnModuleDestroy,
    OnApplicationShutdown,
    BeforeApplicationShutdown
{
  onApplicationBootstrap = Sinon.spy();
  beforeApplicationShutdown = Sinon.spy();
  onApplicationShutdown = Sinon.spy();
  onModuleDestroy = Sinon.spy();
  onModuleInit = Sinon.spy();
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
    Sinon.assert.callOrder(
      instance.onModuleInit,
      instance.onApplicationBootstrap,
      instance.onModuleDestroy,
      instance.beforeApplicationShutdown,
      instance.onApplicationShutdown,
    );
  });
});
