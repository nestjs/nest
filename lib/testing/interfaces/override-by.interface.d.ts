import { OverrideByFactoryOptions } from './override-by-factory-options.interface';
import { TestingModuleBuilder } from '../testing-module.builder';
export interface OverrideBy {
    useValue: (value) => TestingModuleBuilder;
    useFactory: (options: OverrideByFactoryOptions) => TestingModuleBuilder;
    useClass: (metatype) => TestingModuleBuilder;
}
