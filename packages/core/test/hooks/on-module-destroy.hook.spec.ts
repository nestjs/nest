import { OnModuleDestroy } from '@nestjs/common';
import { expect } from 'chai';
import * as sinon from 'sinon';

import { callModuleDestroyHook } from '../../hooks/on-module-destroy.hook';
import { NestContainer } from '../../injector/container';
import { Module } from '../../injector/module';

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

  describe('callModuleDestroyHook', () => {
    it('should call "onModuleDestroy" hook for the entire module', async () => {
      const hookSpy = sinon.spy(sampleProvider, 'onModuleDestroy');
      await callModuleDestroyHook(moduleRef);

      expect(hookSpy.called).to.be.true;
    });
  });
});
