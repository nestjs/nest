import { ModuleMetadata } from '@nestjs/common/interfaces/modules/module-metadata.interface';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';

import { TestingModuleBuilder } from './testing-module.builder';

export class Test {
  private static readonly metadataScanner = new MetadataScanner();

  public static createTestingModule(metadata: ModuleMetadata) {
    return new TestingModuleBuilder(this.metadataScanner, metadata);
  }
}
