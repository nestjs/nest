import { ModuleDefinition } from '@nestjs/core/interfaces/module-definition.interface.js';
import { TestingModuleBuilder } from '../testing-module.builder.js';

/**
 * @publicApi
 */
export interface OverrideModule {
  useModule: (newModule: ModuleDefinition) => TestingModuleBuilder;
}
