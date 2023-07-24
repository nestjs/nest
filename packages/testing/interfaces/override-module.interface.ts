import { ModuleDefinition } from '@nestjs/core/interfaces/module-definition.interface';
import { TestingModuleBuilder } from '../testing-module.builder';

/**
 * @publicApi
 */
export interface OverrideModule {
  useModule: (newModule: ModuleDefinition) => TestingModuleBuilder;
}
