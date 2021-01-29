import { BeforeApplicationShutdown } from '@nestjs/common';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { callBeforeAppShutdownHook } from '../../hooks/before-app-shutdown.hook';
import { NestContainer } from '../../injector/container';
import { Module } from '../../injector/module';

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

      const hookSpy = sinon.spy(sampleProvider, 'beforeApplicationShutdown');
      await callBeforeAppShutdownHook(moduleRef, signal);

      expect(hookSpy.calledWith(signal)).to.be.true;
    });
  });
});
