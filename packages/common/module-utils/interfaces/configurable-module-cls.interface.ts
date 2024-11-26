/* eslint-disable @typescript-eslint/no-empty-object-type */
import { DynamicModule } from '../../interfaces';
import {
  DEFAULT_FACTORY_CLASS_METHOD_KEY,
  DEFAULT_METHOD_KEY,
} from '../constants';
import { ConfigurableModuleAsyncOptions } from './configurable-module-async-options.interface';

/**
 * Class that represents a blueprint/prototype for a configurable Nest module.
 * This class provides static methods for constructing dynamic modules. Their names
 * can be controlled through the "MethodKey" type argument.
 *
 * @publicApi
 */
export type ConfigurableModuleCls<
  ModuleOptions,
  MethodKey extends string = typeof DEFAULT_METHOD_KEY,
  FactoryClassMethodKey extends
    string = typeof DEFAULT_FACTORY_CLASS_METHOD_KEY,
  ExtraModuleDefinitionOptions = {},
> = {
  new (): any;
} & Record<
  `${MethodKey}`,
  (
    options: ModuleOptions & Partial<ExtraModuleDefinitionOptions>,
  ) => DynamicModule
> &
  Record<
    `${MethodKey}Async`,
    (
      options: ConfigurableModuleAsyncOptions<
        ModuleOptions,
        FactoryClassMethodKey
      > &
        Partial<ExtraModuleDefinitionOptions>,
    ) => DynamicModule
  >;
