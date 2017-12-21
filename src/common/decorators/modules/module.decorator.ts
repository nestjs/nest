import 'reflect-metadata';
import { ModuleMetadata } from '../../interfaces/modules/module-metadata.interface';
import { InvalidModuleConfigException } from './exceptions/invalid-module-config.exception';
import { metadata } from '../../constants';

const metadataKeys = [
  metadata.MODULES,
  metadata.EXPORTS,
  metadata.COMPONENTS,
  metadata.CONTROLLERS,
];

const validateKeys = (keys: string[]) => {
  const isKeyValid = key => metadataKeys.findIndex(k => k === key) < 0;
  const validateKey = key => {
    if (isKeyValid(key)) {
      throw new InvalidModuleConfigException(key);
    }
  };
  keys.forEach(validateKey);
};

/**
 * Defines the module
 * - `modules` - the set of the 'imported' modules
 * - `controllers` - the list of controllers (e.g. HTTP controllers)
 * - `components` - the list of components that belong to this module. They can be injected between themselves.
 * - `exports` - the set of components, which should be available for modules, which imports this module
 * @param obj {ModuleMetadata} Module metadata
 */
export function Module(obj: {
  modules?: any[];
  controllers?: any[];
  components?: any[];
  exports?: any[];
}): ClassDecorator {
  const propsKeys = Object.keys(obj);
  validateKeys(propsKeys);

  return (target: object) => {
    for (const property in obj) {
      if (obj.hasOwnProperty(property)) {
        Reflect.defineMetadata(property, obj[property], target);
      }
    }
  };
}
