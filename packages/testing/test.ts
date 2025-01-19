import { ModuleMetadata } from '@nestjs/common/interfaces/modules/module-metadata.interface';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { TestingModuleBuilder } from './testing-module.builder';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';

export class Test {
  private static readonly metadataScanner = new MetadataScanner();

  public static createTestingModule(
    metadata: ModuleMetadata,
    contextOptions: NestApplicationContextOptions | undefined = undefined,
  ) {
    return new TestingModuleBuilder(
      this.metadataScanner,
      metadata,
      contextOptions,
    );
  }
}
