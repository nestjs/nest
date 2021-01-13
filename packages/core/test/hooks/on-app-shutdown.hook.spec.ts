import { OnApplicationShutdown } from '@nestjs/common';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { callAppShutdownHook } from '../../hooks/on-app-shutdown.hook';
import { NestContainer } from '../../injector/container';
import { Module } from '../../injector/module';

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
      const hookSpy = sinon.spy(sampleProvider, 'onApplicationShutdown');
      await callAppShutdownHook(moduleRef);

      expect(hookSpy.called).to.be.true;
    });
  });
});
