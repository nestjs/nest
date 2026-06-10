import { Logger, OnModuleDestroy } from '@nestjs/common';
import { callModuleDestroyHook } from '../../hooks/on-module-destroy.hook.js';
import { NestContainer } from '../../injector/container.js';
import { Module } from '../../injector/module.js';

class SampleProvider implements OnModuleDestroy {
  onModuleDestroy() {}
}

class SampleModule implements OnModuleDestroy {
  onModuleDestroy() {}
}

class WithoutHookProvider {}

describe('OnModuleDestroy', () => {
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

  describe('callModuleDestroyHook', () => {
    it('should call "onModuleDestroy" hook for the entire module', async () => {
      const hookSpy = vi.spyOn(sampleProvider, 'onModuleDestroy');
      await callModuleDestroyHook(moduleRef);

      expect(hookSpy).toHaveBeenCalled();
    });

    it('should not throw when a provider onModuleDestroy rejects', async () => {
      class RejectingProvider implements OnModuleDestroy {
        async onModuleDestroy() {
          throw new Error('cleanup error');
        }
      }
      moduleRef.addProvider({
        provide: RejectingProvider,
        useValue: new RejectingProvider(),
      });

      await expect(callModuleDestroyHook(moduleRef)).resolves.not.toThrow();
    });

    it('should call remaining providers even when one throws', async () => {
      class FailingProvider implements OnModuleDestroy {
        async onModuleDestroy() {
          throw new Error('cleanup error');
        }
      }
      class SuccessProvider implements OnModuleDestroy {
        onModuleDestroy = vi.fn();
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

      await callModuleDestroyHook(moduleRef);

      expect(successProvider.onModuleDestroy).toHaveBeenCalled();
    });

    it('should log errors from failed destroy hooks', async () => {
      const errorSpy = vi.spyOn(Logger, 'error').mockImplementation(() => {});

      class FailingProvider implements OnModuleDestroy {
        async onModuleDestroy() {
          throw new Error('cleanup error');
        }
      }
      moduleRef.addProvider({
        provide: FailingProvider,
        useValue: new FailingProvider(),
      });

      await callModuleDestroyHook(moduleRef);

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should not throw when the module class instance hook rejects', async () => {
      const moduleWrapperRef = moduleRef.getProviderByKey(SampleModule);
      moduleWrapperRef.instance = {
        onModuleDestroy: vi.fn().mockRejectedValue(new Error('module error')),
      };

      await expect(callModuleDestroyHook(moduleRef)).resolves.not.toThrow();
    });
  });
});
