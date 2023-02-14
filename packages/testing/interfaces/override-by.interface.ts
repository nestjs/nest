import { TestingModuleBuilder } from '../testing-module.builder';
import { OverrideByFactoryOptions } from './override-by-factory-options.interface';

/**
 * @publicApi
 */
export interface OverrideBy {
  useValue: (value: any) => TestingModuleBuilder;
  useFactory: (options: OverrideByFactoryOptions) => TestingModuleBuilder;
  useClass: (metatype: any) => TestingModuleBuilder;
}
