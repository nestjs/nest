import {NestEnvironment} from '@nestjs/common/enums/nest-environment.enum';
import {Metatype} from '@nestjs/common/interfaces/metatype.interface';
import {
  ModuleMetadata
} from '@nestjs/common/interfaces/modules/module-metadata.interface';
import {Logger} from '@nestjs/common/services/logger.service';
import {Module} from '@nestjs/common/utils/decorators/module.decorator';
import {InstanceWrapper, NestContainer} from '@nestjs/core/injector/container';
import {InstanceLoader} from '@nestjs/core/injector/instance-loader';
import {MetadataScanner} from '@nestjs/core/metadata-scanner';
import {DependenciesScanner} from '@nestjs/core/scanner';

import {TestingModuleBuilder} from './testing-module.builder';

export class Test {
  private static metadataScanner = new MetadataScanner();

  public static createTestingModule(metadata: ModuleMetadata) {
    this.init();
    return new TestingModuleBuilder(this.metadataScanner, metadata);
  }

  private static init() { Logger.setMode(NestEnvironment.TEST); }
}
