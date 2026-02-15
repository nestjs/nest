import { TestingModuleBuilder } from '../testing-module.builder.js';
import type { ModuleDefinition } from '@nestjs/core/internal';

/**
 * @publicApi
 */
export interface OverrideModule {
  useModule: (newModule: ModuleDefinition) => TestingModuleBuilder;
}
