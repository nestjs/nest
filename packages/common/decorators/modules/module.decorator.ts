import * as deprecate from 'deprecate';
import 'reflect-metadata';
import { METADATA as metadataConstants } from '../../constants';
import { ModuleMetadata } from '../../interfaces/modules/module-metadata.interface';
import { InvalidModuleConfigException } from './exceptions/invalid-module-config.exception';

const metadataKeys = [
  metadataConstants.MODULES,
  metadataConstants.IMPORTS,
  metadataConstants.EXPORTS,
  metadataConstants.COMPONENTS,
  metadataConstants.CONTROLLERS,
  metadataConstants.PROVIDERS,
];

const validateKeys = (keys: string[]) => {
  const isKeyInvalid = key => metadataKeys.findIndex(k => k === key) < 0;
  const validateKey = key => {
    if (!isKeyInvalid(key)) {
      return;
    }
    throw new InvalidModuleConfigException(key);
  };
  keys.forEach(validateKey);
};

/**
 * Defines the module
 * - `imports` - the set of the 'imported' modules
 * - `controllers` - the list of controllers (e.g. HTTP controllers)
 * - `providers` - the list of providers that belong to this module. They can be injected between themselves.
 * - `exports` - the set of components, which should be available for modules, which imports this module
 * - `components` - @deprecated the list of components that belong to this module. They can be injected between themselves.
 * @param options {ModuleMetadata} Module metadata
 */
export function Module(metadata: ModuleMetadata): ClassDecorator {
  const propsKeys = Object.keys(metadata);

  validateKeys(propsKeys);
  showDeprecatedWarnings(metadata);
  overrideModuleMetadata(metadata);

  return (target: object) => {
    for (const property in metadata) {
      if (metadata.hasOwnProperty(property)) {
        Reflect.defineMetadata(property, metadata[property], target);
      }
    }
  };
}

function overrideModuleMetadata(moduleMetadata: ModuleMetadata) {
  moduleMetadata.modules = moduleMetadata.imports
    ? moduleMetadata.imports
    : moduleMetadata.modules;

  moduleMetadata.components = moduleMetadata.providers
    ? moduleMetadata.providers
    : moduleMetadata.components;
}

function showDeprecatedWarnings(moduleMetadata: ModuleMetadata) {
  const MODULES_DEPRECATED_WARNING =
    'The "modules" key in the @Module() decorator is deprecated and will be removed within next major release. Use the "imports" key instead.';
  const COMPONENTS_DEPRECATED_WARNING =
    'The "components" key in the @Module() decorator is deprecated and will be removed within next major release. Use the "providers" key instead.';

  moduleMetadata.modules && deprecate(MODULES_DEPRECATED_WARNING);
  moduleMetadata.components && deprecate(COMPONENTS_DEPRECATED_WARNING);
}
