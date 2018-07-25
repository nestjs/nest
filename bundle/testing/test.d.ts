import { ModuleMetadata } from '@nestjs/common/interfaces/modules/module-metadata.interface';
import { TestingModuleBuilder } from './testing-module.builder';
export declare class Test {
    private static readonly metadataScanner;
    static createTestingModule(metadata: ModuleMetadata): TestingModuleBuilder;
}
