import { OverrideBy } from './interfaces';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { ModuleMetadata } from '@nestjs/common/interfaces';
import { TestingModule } from './testing-module';
export declare class TestingModuleBuilder {
    private readonly container;
    private readonly overloadsMap;
    private readonly scanner;
    private readonly instanceLoader;
    private readonly module;
    constructor(metadataScanner: MetadataScanner, metadata: ModuleMetadata);
    overrideGuard(typeOrToken: any): OverrideBy;
    overrideInterceptor(typeOrToken: any): OverrideBy;
    overrideComponent(typeOrToken: any): OverrideBy;
    compile(): Promise<TestingModule>;
    private override(typeOrToken, isComponent);
    private createOverrideByBuilder(add);
    private createModule(metadata);
}
