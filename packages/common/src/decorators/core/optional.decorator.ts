import 'reflect-metadata';
import { OPTIONAL_DEPS_METADATA } from '../../constants';

/**
 * Sets dependency as an optional one.
 */
export function Optional(): ParameterDecorator {
  return (target, key, index) => {
    const args = Reflect.getMetadata(OPTIONAL_DEPS_METADATA, target) || [];
    Reflect.defineMetadata(OPTIONAL_DEPS_METADATA, [...args, index], target);
  };
}
