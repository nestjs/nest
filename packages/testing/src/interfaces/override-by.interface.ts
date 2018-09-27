import { Type } from '@nest/core';

import { OverrideByFactoryOptions } from './override-by-factory-options.interface';
import { TestingModuleBuilder } from '../testing-module.builder';

export interface OverrideBy {
  useValue: (value: any) => TestingModuleBuilder;
  useFactory: (options: OverrideByFactoryOptions) => TestingModuleBuilder;
  useClass: (metatype: Type<any>) => TestingModuleBuilder;
}
