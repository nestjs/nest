import { Metatype } from '@nestjs/common/interfaces';
import { OverrideByFactoryOptions } from './override-by-factory-options.interface';
import { TestingModuleBuilder } from '../testing-module.builder';

export interface OverrideBy {
    useValue: (value: any) => TestingModuleBuilder;
    useFactory: (options: OverrideByFactoryOptions) => TestingModuleBuilder;
    useClass: (metatype: Metatype<any>) => TestingModuleBuilder;
}
