import {
  TestingModuleBuilder,
  TestingModuleOptions,
} from './testing-module.builder.js';
import { ModuleMetadata } from '@nestjs/common';
import { MetadataScanner } from '@nestjs/core';

export class Test {
  private static readonly metadataScanner = new MetadataScanner();

  public static createTestingModule(
    metadata: ModuleMetadata,
    options?: TestingModuleOptions,
  ) {
    return new TestingModuleBuilder(this.metadataScanner, metadata, options);
  }
}
