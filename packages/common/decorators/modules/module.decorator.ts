import { METADATA as metadataConstants } from '../../constants';
import { ModuleMetadata } from '../../interfaces/modules/module-metadata.interface';
import { InvalidModuleConfigException } from './exceptions/invalid-module-config.exception';

/**
 * The valid keys of a ModuleMetadata
 */
const metadataKeys = [
  metadataConstants.IMPORTS,
  metadataConstants.EXPORTS,
  metadataConstants.CONTROLLERS,
  metadataConstants.PROVIDERS,
];

/**
 * Checks if the given ModuleMetadat keys are valid
 * or invalid
 *
 * @param keys Array of ModuleMetadata keys which should get validated
 *
 * @throws {InvalidModuleConfigException} Found key which is not valid
 */
const validateKeys = (keys: string[]): void => {
  // Checks if the given key is valid
  const isKeyInvalid = key => metadataKeys.findIndex(k => k === key) < 0;

  // Throws an exception if the key is invalid
  const validateKey = key => {
    if (!isKeyInvalid(key)) {
      return;
    }
    throw new InvalidModuleConfigException(key);
  };

  // Checks the given keys for validty
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

  return (target: object) => {
    for (const property in metadata) {
      if (metadata.hasOwnProperty(property)) {
        Reflect.defineMetadata(property, metadata[property], target);
      }
    }
  };
}
