import { BeforeApplicationShutdown } from '@nestjs/common';
import { callBeforeAppShutdownHook } from '../../hooks/before-app-shutdown.hook.js';
import { NestContainer } from '../../injector/container.js';
import { Module } from '../../injector/module.js';

class SampleProvider implements BeforeApplicationShutdown {
  beforeApplicationShutdown(signal?: string) {}
}

class SampleModule implements BeforeApplicationShutdown {
  beforeApplicationShutdown(signal?: string) {}
}

class WithoutHookProvider {}

describe('BeforeAppShutdown', () => {
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

  describe('callBeforeAppShutdownHook', () => {
    it('should call "beforeApplicationShutdown" hook for the entire module', async () => {
      const signal = 'SIGTERM';

      const hookSpy = vi.spyOn(sampleProvider, 'beforeApplicationShutdown');
      await callBeforeAppShutdownHook(moduleRef, signal);

      expect(hookSpy).toHaveBeenCalledWith(signal);
    });
  });
});
