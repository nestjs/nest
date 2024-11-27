import {
  Controller,
  DynamicModule,
  forwardRef,
  Global,
  Injectable,
  Module,
} from '@nestjs/common';
import { LazyModuleLoader } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';
import { AModule, AProvider } from '../circular-dependency/a.module';
import { BModule, BProvider } from '../circular-dependency/b.module';

describe('Modules overriding', () => {
  describe('Top-level module', () => {
    @Controller()
    class ControllerOverwritten {}

    @Module({
      controllers: [ControllerOverwritten],
    })
    class ModuleToBeOverwritten {}

    @Controller()
    class ControllerOverride {}

    @Module({
      controllers: [ControllerOverride],
    })
    class ModuleOverride {}

    let testingModule: TestingModule;

    beforeEach(async () => {
      testingModule = await Test.createTestingModule({
        imports: [ModuleToBeOverwritten],
      })
        .overrideModule(ModuleToBeOverwritten)
        .useModule(ModuleOverride)
        .compile();
    });

    it('should override top-level modules using testing module builder', () => {
      expect(() =>
        testingModule.get<ControllerOverwritten>(ControllerOverwritten),
      ).to.throw();
      expect(
        testingModule.get<ControllerOverride>(ControllerOverride),
      ).to.be.an.instanceof(ControllerOverride);
    });
  });

  describe('Dynamic module', () => {
    @Controller()
    class ControllerOverwritten {}

    @Module({})
    class DynamicModuleToBeOverwritten {}

    const dynamicModuleOverwritten: DynamicModule = {
      module: DynamicModuleToBeOverwritten,
      controllers: [ControllerOverwritten],
    };

    @Controller()
    class ControllerOverride {}

    @Module({})
    class DynamicModuleOverride {}

    const dynamicModuleOverride: DynamicModule = {
      module: DynamicModuleOverride,
      controllers: [ControllerOverride],
    };

    let testingModule: TestingModule;

    beforeEach(async () => {
      testingModule = await Test.createTestingModule({
        imports: [dynamicModuleOverwritten],
      })
        .overrideModule(dynamicModuleOverwritten)
        .useModule(dynamicModuleOverride)
        .compile();
    });

    it('should override dynamic modules using testing module builder', () => {
      expect(() =>
        testingModule.get<ControllerOverwritten>(ControllerOverwritten),
      ).to.throw();
      expect(
        testingModule.get<ControllerOverride>(ControllerOverride),
      ).to.be.an.instanceof(ControllerOverride);
    });
  });

  describe('Circular dependency module', () => {
    let testingModule: TestingModule;

    @Injectable()
    class CProvider {}

    @Module({
      providers: [CProvider],
    })
    class CModule {}

    @Injectable()
    class BProviderOverride {}

    @Module({
      imports: [forwardRef(() => AModule), forwardRef(() => CModule)],
      providers: [BProviderOverride],
      exports: [BProviderOverride],
    })
    class BModuleOverride {}

    beforeEach(async () => {
      testingModule = await Test.createTestingModule({
        imports: [AModule],
      })
        .overrideModule(BModule)
        .useModule(BModuleOverride)
        .compile();
    });

    it('should override top-level modules using testing module builder', () => {
      expect(testingModule.get<AProvider>(AProvider)).to.be.an.instanceof(
        AProvider,
      );
      expect(() => testingModule.get<BProvider>(BProvider)).to.throw();
      expect(testingModule.get<CProvider>(CProvider)).to.be.an.instanceof(
        CProvider,
      );
      expect(
        testingModule.get<BProviderOverride>(BProviderOverride),
      ).to.be.an.instanceof(BProviderOverride);
    });
  });

  describe('Nested module', () => {
    let testingModule: TestingModule;

    @Controller()
    class OverwrittenNestedModuleController {}

    @Module({
      controllers: [OverwrittenNestedModuleController],
    })
    class OverwrittenNestedModule {}

    @Controller()
    class OverrideNestedModuleController {}

    @Module({
      controllers: [OverrideNestedModuleController],
    })
    class OverrideNestedModule {}

    @Module({
      imports: [OverwrittenNestedModule],
    })
    class AppModule {}

    beforeEach(async () => {
      testingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideModule(OverwrittenNestedModule)
        .useModule(OverrideNestedModule)
        .compile();
    });

    it('should override nested modules using testing module builder', () => {
      expect(
        testingModule.get<OverrideNestedModuleController>(
          OverrideNestedModuleController,
        ),
      ).to.be.an.instanceof(OverrideNestedModuleController);
      expect(() =>
        testingModule.get<OverwrittenNestedModuleController>(
          OverwrittenNestedModuleController,
        ),
      ).to.throw();
    });
  });

  describe('Lazy-loaded module', () => {
    let testingModule: TestingModule;

    @Injectable()
    class OverwrittenLazyProvider {
      value() {
        return 'overwritten lazy';
      }
    }

    @Module({
      providers: [
        {
          provide: 'LAZY_PROVIDER',
          useClass: OverwrittenLazyProvider,
        },
      ],
    })
    class OverwrittenLazyModule {}

    @Injectable()
    class OverrideLazyProvider {
      value() {
        return 'override lazy';
      }
    }

    @Module({
      providers: [
        {
          provide: 'LAZY_PROVIDER',
          useClass: OverrideLazyProvider,
        },
      ],
    })
    class OverrideLazyModule {}

    @Injectable()
    class AppService {
      constructor(private lazyModuleLoader: LazyModuleLoader) {}

      async value() {
        const moduleRef = await this.lazyModuleLoader.load(
          () => OverwrittenLazyModule,
        );
        return moduleRef.get('LAZY_PROVIDER').value();
      }
    }

    @Module({
      imports: [],
      providers: [AppService],
    })
    class AppModule {}

    beforeEach(async () => {
      testingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideModule(OverwrittenLazyModule)
        .useModule(OverrideLazyModule)
        .compile();
    });

    it('should override lazy loaded modules using testing module builder', async () => {
      const result = await testingModule.get<AppService>(AppService).value();
      expect(result).to.be.equal('override lazy');
    });
  });

  describe('Global module', () => {
    let testingModule: TestingModule;

    @Injectable()
    class OverwrittenProvider {
      value() {
        return 'overwritten lazy';
      }
    }

    @Global()
    @Module({
      providers: [OverwrittenProvider],
      exports: [OverwrittenProvider],
    })
    class OverwrittenModule {}

    @Injectable()
    class OverrideProvider {
      value() {
        return 'override lazy';
      }
    }

    @Global()
    @Module({
      providers: [OverrideProvider],
      exports: [OverrideProvider],
    })
    class OverrideModule {}

    beforeEach(async () => {
      testingModule = await Test.createTestingModule({
        imports: [OverwrittenModule],
      })
        .overrideModule(OverwrittenModule)
        .useModule(OverrideModule)
        .compile();
    });

    it('should override global modules using testing module builder', () => {
      expect(
        testingModule.get<OverrideProvider>(OverrideProvider),
      ).to.be.an.instanceof(OverrideProvider);
      expect(() =>
        testingModule.get<OverwrittenProvider>(OverwrittenProvider),
      ).to.throw();
    });
  });
});
