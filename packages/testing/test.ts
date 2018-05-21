import {
  NestContainer,
  InstanceWrapper,
} from '@nestjs/core/injector/container';
import { ModuleMetadata } from '@nestjs/common/interfaces/modules/module-metadata.interface';
import { DependenciesScanner } from '@nestjs/core/scanner';
import { InstanceLoader } from '@nestjs/core/injector/instance-loader';
import { Logger } from '@nestjs/common/services/logger.service';
import { NestEnvironment } from '@nestjs/common/enums/nest-environment.enum';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { TestingModuleBuilder } from './testing-module.builder';
import { TestOptions } from './interfaces/test-options.interface';

export class Test {
  private static readonly metadataScanner = new MetadataScanner();

  public static createTestingModule(metadata: ModuleMetadata, testOptions: TestOptions) {
    this.init(testOptions);
    return new TestingModuleBuilder(this.metadataScanner, metadata);
  }

  private static init(testOptions: TestOptions) {
    Logger.setMode(testOptions.logging);
  }
}
