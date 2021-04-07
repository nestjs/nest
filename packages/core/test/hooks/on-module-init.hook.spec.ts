import { OnModuleInit } from '@nestjs/common';
import { expect } from 'chai';
import * as sinon from 'sinon';

import { callModuleInitHook } from '../../hooks/on-module-init.hook';
import { NestContainer } from '../../injector/container';
import { Module } from '../../injector/module';

class SampleProvider implements OnModuleInit {
  onModuleInit() {}
}

class SampleModule implements OnModuleInit {
  onModuleInit() {}
}

class WithoutHookProvider {}

describe('OnModuleInit', () => {
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

  describe('callModuleInitHook', () => {
    it('should call "onModuleInit" hook for the entire module', async () => {
      const hookSpy = sinon.spy(sampleProvider, 'onModuleInit');
      await callModuleInitHook(moduleRef);

      expect(hookSpy.called).to.be.true;
    });
  });
});
