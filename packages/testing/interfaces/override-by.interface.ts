import { TestingModuleBuilder } from '../testing-module.builder.js';
import { OverrideByFactoryOptions } from './override-by-factory-options.interface.js';

/**
 * @publicApi
 */
export interface OverrideBy {
  useValue: (value: any) => TestingModuleBuilder;
  useFactory: (options: OverrideByFactoryOptions) => TestingModuleBuilder;
  useClass: (metatype: any) => TestingModuleBuilder;
}
