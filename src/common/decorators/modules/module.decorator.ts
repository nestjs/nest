import 'reflect-metadata';
import { ModuleMetadata } from '../../interfaces/modules/module-metadata.interface';
import { InvalidModuleConfigException } from './exceptions/invalid-module-config.exception';
import { metadata } from '../../constants';

const metadataKeys = [
  metadata.MODULES,
  metadata.IMPORTS,
  metadata.EXPORTS,
  metadata.COMPONENTS,
  metadata.CONTROLLERS,
  metadata.PROVIDERS,
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
 * - `modules` - @deprecated the set of the 'imported' modules
 * - `components` - @deprecated the list of components that belong to this module. They can be injected between themselves.
 * @param obj {ModuleMetadata} Module metadata
 */
export function Module(obj: ModuleMetadata): ClassDecorator {
  const propsKeys = Object.keys(obj);
  validateKeys(propsKeys);
  overrideModuleMetadata(obj);

  return (target: object) => {
    for (const property in obj) {
      if (obj.hasOwnProperty(property)) {
        Reflect.defineMetadata(property, obj[property], target);
      }
    }
  };
}

function overrideModuleMetadata(metadata: ModuleMetadata) {
  metadata.modules = metadata.imports
    ? metadata.imports
    : metadata.modules;

  metadata.components = metadata.providers
    ? metadata.providers
    : metadata.components;
}