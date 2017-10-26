import { InstanceWrapper, NestContainer } from '@nestjs/core/injector/container';
import { InstanceLoader } from '@nestjs/core/injector/instance-loader';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { DependenciesScanner } from '@nestjs/core/scanner';
import { NestEnvironment } from '/enums/nest-environment.enum';
import { Metatype } from '/interfaces/metatype.interface';
import { ModuleMetadata } from '/interfaces/modules/module-metadata.interface';
import { Logger } from '/services/logger.service';
import { Module } from '/utils/decorators/module.decorator';
import { TestingModuleBuilder } from './testing-module.builder';

export class Test {
    private static metadataScanner = new MetadataScanner();

    public static createTestingModule(metadata: ModuleMetadata) {
        this.init();
        return new TestingModuleBuilder(this.metadataScanner, metadata);
    }

    private static init() {
        Logger.setMode(NestEnvironment.TEST);
    }
}

