import { NestContainer, InstanceWrapper } from '@nestjs/core/injector/container';
import { ModuleMetadata } from '@nestjs/common/interfaces/modules/module-metadata.interface';
import { Module } from '@nestjs/common/utils/decorators/module.decorator';
import { DependenciesScanner } from '@nestjs/core/scanner';
import { InstanceLoader } from '@nestjs/core/injector/instance-loader';
import { Metatype } from '@nestjs/common/interfaces/metatype.interface';
import { Logger } from '@nestjs/common/services/logger.service';
import { NestEnvironment } from '@nestjs/common/enums/nest-environment.enum';

export class Test {
    private static container = new NestContainer();
    private static scanner = new DependenciesScanner(Test.container);
    private static instanceLoader = new InstanceLoader(Test.container);

    public static createTestingModule(metadata: ModuleMetadata) {
        this.init();
        const module = this.createModule(metadata);
        this.scanner.scan(module);
        this.instanceLoader.createInstancesOfDependencies();
    }

    public static get<T>(metatype: Metatype<T>): T {
        const modules = this.container.getModules();
        return this.findInstanceByPrototype<T>(metatype, modules);
    }

    public static restart() {
        this.container.clear();
    }

    private static init() {
        Logger.setMode(NestEnvironment.TEST);
        this.restart();
    }

    private static findInstanceByPrototype<T>(metatype: Metatype<T>, modules) {
        for (const [ _, module ] of modules) {
            const dependencies = new Map([ ...module.components, ...module.routes ]);
            const instanceWrapper = dependencies.get(metatype.name);

            if (instanceWrapper) {
                return (instanceWrapper as InstanceWrapper<any>).instance;
            }
        }
        return null;
    }

    private static createModule(metadata) {
        class TestModule {}
        Module(metadata)(TestModule);
        return TestModule;
    }
}

