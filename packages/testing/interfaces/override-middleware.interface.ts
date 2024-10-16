import { ModuleDefinition } from '@nestjs/core/interfaces/module-definition.interface';
import { TestingModuleBuilder } from '../testing-module.builder';
import { Type } from '@nestjs/common';

/**
 * @publicApi
 */
export interface OverrideMiddleware {
  use: (...newMiddleware: (Type<any> | Function)[]) => TestingModuleBuilder;
}
