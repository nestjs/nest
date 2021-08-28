import { Test, TestingModule } from '@nestjs/testing';
import { CoreInjectablesModule } from '../src/core-injectables/core-injectables.module';
import { ApplicationConfig, ModuleRef } from '@nestjs/core';

describe('Core Injectables', () => {
  let testingModule: TestingModule;

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      imports: [CoreInjectablesModule],
    });
    testingModule = await builder.compile();
  });

  it('should provide ApplicationConfig as core injectable', () => {
    const applicationConfig =
      testingModule.get<ApplicationConfig>(ApplicationConfig);

    applicationConfig.setGlobalPrefix('/api');

    expect(applicationConfig).not.toBeUndefined();
    expect(applicationConfig.getGlobalPrefix()).toBe('/api');
  });

  it('should provide ModuleRef as core injectable', () => {
    const moduleRef = testingModule.get<ModuleRef>(ModuleRef);
    expect(moduleRef).not.toBeUndefined();
  });

  it('should provide the current Module as provider', () => {
    const module = testingModule.get<CoreInjectablesModule>(
      CoreInjectablesModule,
    );
    expect(module).not.toBeUndefined();
    expect(module.constructor.name).toBe('CoreInjectablesModule');
  });
});
