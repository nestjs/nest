import { Inject, Module } from '@nestjs/common';
import {
  ConfigurableModuleClass,
  initialize,
  MODULE_OPTIONS_TOKEN,
} from './integration.module-definition';
import { IntegrationModuleOptions } from './interfaces/integration-module-options.interface';

@Module({})
export class IntegrationModule extends ConfigurableModuleClass {
  static module = initialize(IntegrationModule);

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    public readonly options: IntegrationModuleOptions,
  ) {
    super();
  }
}
