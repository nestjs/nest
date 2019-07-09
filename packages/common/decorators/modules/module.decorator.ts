import { METADATA as metadataConstants } from '../../constants';
import { ModuleMetadata } from '../../interfaces/modules/module-metadata.interface';
import { InvalidModuleConfigException } from './exceptions/invalid-module-config.exception';

const metadataKeys = [
  metadataConstants.IMPORTS,
  metadataConstants.EXPORTS,
  metadataConstants.CONTROLLERS,
  metadataConstants.PROVIDERS,
];

const validateKeys = (keys: string[]) => {

  const validateKey = (key: string) => {
    if (metadataKeys.includes(key)) {
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
 * @param metadata {ModuleMetadata} Module metadata
 */
export function Module(metadata: ModuleMetadata): ClassDecorator {
  const propsKeys = Object.keys(metadata);
  validateKeys(propsKeys);

  return (target: object) => {
    for (const property in metadata) {
      if (metadata.hasOwnProperty(property)) {
        Reflect.defineMetadata(property, (metadata as any)[property], target);
      }
    }
  };
}
