import { OnApplicationShutdown } from '@nestjs/common';
import { callAppShutdownHook } from '../../hooks/on-app-shutdown.hook.js';
import { NestContainer } from '../../injector/container.js';
import { Module } from '../../injector/module.js';

class SampleProvider implements OnApplicationShutdown {
  onApplicationShutdown() {}
}

class SampleModule implements OnApplicationShutdown {
  onApplicationShutdown() {}
}

class WithoutHookProvider {}

describe('OnApplicationShutdown', () => {
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

  describe('callAppShutdownHook', () => {
    it('should call "onApplicationShutdown" hook for the entire module', async () => {
      const hookSpy = vi.spyOn(sampleProvider, 'onApplicationShutdown');
      await callAppShutdownHook(moduleRef);

      expect(hookSpy).toHaveBeenCalled();
    });
  });
});
