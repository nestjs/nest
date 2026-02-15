import { Inject, Module } from '@nestjs/common';
import {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
} from './integration.module-definition.js';
import { IntegrationModuleOptions } from './interfaces/integration-module-options.interface.js';

@Module({})
export class IntegrationModule extends ConfigurableModuleClass {
  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    public readonly options: IntegrationModuleOptions,
  ) {
    super();
  }
}
