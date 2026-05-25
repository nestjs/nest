import { OnApplicationBootstrap } from '@nestjs/common';
import { callModuleBootstrapHook } from '../../hooks/on-app-bootstrap.hook.js';
import { NestContainer } from '../../injector/container.js';
import { Module } from '../../injector/module.js';

class SampleProvider implements OnApplicationBootstrap {
  onApplicationBootstrap() {}
}

class SampleModule implements OnApplicationBootstrap {
  onApplicationBootstrap() {}
}

class WithoutHookProvider {}

describe('OnApplicationBootstrap', () => {
  let moduleRef: Module;
  let sampleProvider: SampleProvider;

  beforeEach(() => {
    sampleProvider = new SampleProvider();
    moduleRef = new Module(SampleModule, new NestContainer());

    const moduleWrapperRef = moduleRef.getProviderByKey(SampleModule);
    moduleWrapperRef.instance = new SampleModule();

    moduleRef.addProvider({
      provide: SampleProvider,
      useValue: sampleProvider,
    });
    moduleRef.addProvider({
      provide: WithoutHookProvider,
      useValue: new WithoutHookProvider(),
    });
  });

  describe('callModuleBootstrapHook', () => {
    it('should call "onApplicationBootstrap" hook for the entire module', async () => {
      const hookSpy = vi.spyOn(sampleProvider, 'onApplicationBootstrap');
      await callModuleBootstrapHook(moduleRef);

      expect(hookSpy).toHaveBeenCalled();
    });
  });
});
