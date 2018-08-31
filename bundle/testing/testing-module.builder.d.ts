import { ModuleMetadata } from '@nestjs/common/interfaces';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { OverrideBy } from './interfaces';
import { TestingModule } from './testing-module';
export declare class TestingModuleBuilder {
    private readonly applicationConfig;
    private readonly container;
    private readonly overloadsMap;
    private readonly scanner;
    private readonly instanceLoader;
    private readonly module;
    constructor(metadataScanner: MetadataScanner, metadata: ModuleMetadata);
    overridePipe(typeOrToken: any): OverrideBy;
    overrideFilter(typeOrToken: any): OverrideBy;
    overrideGuard(typeOrToken: any): OverrideBy;
    overrideInterceptor(typeOrToken: any): OverrideBy;
    /** @deprecated */
    overrideComponent(typeOrToken: any): OverrideBy;
    overrideProvider(typeOrToken: any): OverrideBy;
    compile(): Promise<TestingModule>;
    private override(typeOrToken, isComponent);
    private createOverrideByBuilder(add);
    private applyOverloadsMap();
    private getRootModule();
    private createModule(metadata);
    private applyLogger();
}
