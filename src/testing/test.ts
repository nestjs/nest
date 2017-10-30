import { NestEnvironment } from '@nestjs/core/enums/nest-environment.enum';
import { InstanceWrapper, NestContainer } from '@nestjs/core/injector/container';
import { InstanceLoader } from '@nestjs/core/injector/instance-loader';
import { Metatype } from '@nestjs/core/interfaces/metatype.interface';
import { ModuleMetadata } from '@nestjs/core/interfaces/modules/module-metadata.interface';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { DependenciesScanner } from '@nestjs/core/scanner';
import { Logger } from '@nestjs/core/services/logger.service';
import { Module } from '@nestjs/core/utils/decorators/module.decorator';
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

