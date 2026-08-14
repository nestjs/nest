import { Logger, OnApplicationShutdown } from '@nestjs/common';
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

    it('should not throw when a provider onApplicationShutdown rejects', async () => {
      class RejectingProvider implements OnApplicationShutdown {
        async onApplicationShutdown() {
          throw new Error('shutdown error');
        }
      }
      moduleRef.addProvider({
        provide: RejectingProvider,
        useValue: new RejectingProvider(),
      });

      await expect(callAppShutdownHook(moduleRef)).resolves.not.toThrow();
    });

    it('should call remaining providers even when one throws', async () => {
      class FailingProvider implements OnApplicationShutdown {
        async onApplicationShutdown() {
          throw new Error('shutdown error');
        }
      }
      class SuccessProvider implements OnApplicationShutdown {
        onApplicationShutdown = vi.fn();
      }

      const successProvider = new SuccessProvider();
      moduleRef.addProvider({
        provide: FailingProvider,
        useValue: new FailingProvider(),
      });
      moduleRef.addProvider({
        provide: SuccessProvider,
        useValue: successProvider,
      });

      await callAppShutdownHook(moduleRef);

      expect(successProvider.onApplicationShutdown).toHaveBeenCalled();
    });

    it('should log errors from failed onApplicationShutdown hooks', async () => {
      const errorSpy = vi.spyOn(Logger, 'error').mockImplementation(() => {});

      class FailingProvider implements OnApplicationShutdown {
        async onApplicationShutdown() {
          throw new Error('shutdown error');
        }
      }
      moduleRef.addProvider({
        provide: FailingProvider,
        useValue: new FailingProvider(),
      });

      await callAppShutdownHook(moduleRef);

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should not throw when the module class instance hook rejects', async () => {
      const moduleWrapperRef = moduleRef.getProviderByKey(SampleModule);
      moduleWrapperRef.instance = {
        onApplicationShutdown: vi
          .fn()
          .mockRejectedValue(new Error('module error')),
      };

      await expect(callAppShutdownHook(moduleRef)).resolves.not.toThrow();
    });
  });
});
