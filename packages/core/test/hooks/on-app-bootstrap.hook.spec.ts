import { OnApplicationBootstrap } from '@nestjs/common';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { callModuleBootstrapHook } from '../../hooks/on-app-bootstrap.hook';
import { NestContainer } from '../../injector/container';
import { Module } from '../../injector/module';

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

    const moduleWrapperRef = moduleRef.getProviderByKey(SampleModule.name);
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
      const hookSpy = sinon.spy(sampleProvider, 'onApplicationBootstrap');
      await callModuleBootstrapHook(moduleRef);

      expect(hookSpy.called).to.be.true;
    });
  });
});
