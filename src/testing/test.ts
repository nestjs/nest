import { NestContainer, InstanceWrapper } from '../core/injector/container';
import { ModuleMetadata } from '../common/interfaces/module-metadata.interface';
import { Module } from '../common/utils/module.decorator';
import { DependenciesScanner } from '../core/scanner';
import { InstanceLoader } from '../core/injector/instance-loader';
import { Metatype } from '../common/interfaces/metatype.interface';
import { Logger } from '../common/services/logger.service';
import { NestMode } from '../common/enums/nest-mode.enum';

export class Test {
    private static container = new NestContainer();
    private static scanner = new DependenciesScanner(Test.container);
    private static instanceLoader = new InstanceLoader(Test.container);

    static createTestingModule(metadata: ModuleMetadata) {
        Logger.setMode(NestMode.TEST);
        this.restart();

        const module = this.createModule(metadata);
        this.scanner.scan(module);
        this.instanceLoader.createInstancesOfDependencies();
    }

    static get<T>(metatype: Metatype<T>): T {
        const modules = this.container.getModules();
        return this.findInstanceByPrototype<T>(metatype, modules);
    }

    static restart() {
        this.container.clear();
    }

    private static findInstanceByPrototype<T>(metatype: Metatype<T>, modules) {
        for(const [ _, module ] of modules) {
            const dependencies = new Map([ ...module.components, ...module.routes ]);
            const instanceWrapper = dependencies.get(metatype.name);

            if (instanceWrapper) {
                return (<InstanceWrapper<any>>instanceWrapper).instance;
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

