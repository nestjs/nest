import { BeforeApplicationShutdown, Logger } from '@nestjs/common';
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

    it('should not throw when a provider beforeApplicationShutdown rejects', async () => {
      class RejectingProvider implements BeforeApplicationShutdown {
        async beforeApplicationShutdown() {
          throw new Error('shutdown error');
        }
      }
      moduleRef.addProvider({
        provide: RejectingProvider,
        useValue: new RejectingProvider(),
      });

      await expect(
        callBeforeAppShutdownHook(moduleRef, 'SIGTERM'),
      ).resolves.not.toThrow();
    });

    it('should call remaining providers even when one throws', async () => {
      class FailingProvider implements BeforeApplicationShutdown {
        async beforeApplicationShutdown() {
          throw new Error('shutdown error');
        }
      }
      class SuccessProvider implements BeforeApplicationShutdown {
        beforeApplicationShutdown = vi.fn();
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

      await callBeforeAppShutdownHook(moduleRef, 'SIGTERM');

      expect(successProvider.beforeApplicationShutdown).toHaveBeenCalled();
    });

    it('should log errors from failed beforeApplicationShutdown hooks', async () => {
      const errorSpy = vi.spyOn(Logger, 'error').mockImplementation(() => {});

      class FailingProvider implements BeforeApplicationShutdown {
        async beforeApplicationShutdown() {
          throw new Error('shutdown error');
        }
      }
      moduleRef.addProvider({
        provide: FailingProvider,
        useValue: new FailingProvider(),
      });

      await callBeforeAppShutdownHook(moduleRef, 'SIGTERM');

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should not throw when the module class instance hook rejects', async () => {
      const moduleWrapperRef = moduleRef.getProviderByKey(SampleModule);
      moduleWrapperRef.instance = {
        beforeApplicationShutdown: vi
          .fn()
          .mockRejectedValue(new Error('module error')),
      };

      await expect(
        callBeforeAppShutdownHook(moduleRef, 'SIGTERM'),
      ).resolves.not.toThrow();
    });
  });
});
