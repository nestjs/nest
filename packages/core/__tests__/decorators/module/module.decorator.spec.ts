import 'reflect-metadata';
import { Injectable, Module, ModuleWithProviders } from '@nest/core';
import { Test } from '@nest/testing';

describe('@Module()', () => {
  it('should accept ModuleMetadata', async () => {
    @Module()
    class TestModule {}

    const test = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    const testModule = test.container.getModule(TestModule);

    expect(testModule.target).toStrictEqual(TestModule);
    expect(test.container.modules.size).toStrictEqual(2);

    const modules = test.container.getModules().values();
    const imports = modules.next().value.imports.values();
    expect(imports.next().value.target).toStrictEqual(TestModule);
  });

  it('should accept ModuleWithProviders', async () => {
    @Injectable()
    class AppService {}

    @Module()
    class AppModule {
      static forRoot(): ModuleWithProviders {
        return {
          module: AppModule,
          providers: [AppService],
        };
      }
    }

    const test = await Test.createTestingModule({
      imports: [
        AppModule.forRoot(),
      ],
    }).compile();

    const appModule = test.container.getModule(AppModule);
    const rootModule = test.getRootModule();

    expect(appModule.target).toStrictEqual(AppModule);
    expect(test.container.isProviderBound(AppService)).toBeTruthy();
    expect(
      test.container.getProvider(AppService, appModule.target),
    ).toBeInstanceOf(AppService);
    expect(appModule.providers.get(AppService)).toBeInstanceOf(AppService);
    expect(() => rootModule.providers.get(AppService)).toThrowError();
  });
  it('should accept dynamic imports', () => {});
  it('should accept async dynamic imports', () => {});
});
