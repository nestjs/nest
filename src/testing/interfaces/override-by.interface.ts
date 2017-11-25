import {TestingModuleBuilder} from '../testing-module.builder';

import {
  OverrideByFactoryOptions
} from './override-by-factory-options.interface';

export interface OverrideBy {
  useValue: (value) => TestingModuleBuilder;
  useFactory: (options: OverrideByFactoryOptions) => TestingModuleBuilder;
  useClass: (metatype) => TestingModuleBuilder;
}