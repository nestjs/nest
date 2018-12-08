import { isUndefined } from '../../utils/shared.utils';
import { PATH_METADATA } from '../../constants';

/**
 * Defines the Controller. The controller can inject dependencies through constructor.
 * Those dependencies have to belong to the same module.
 */
export function Controller(prefix?: string): ClassDecorator {
  const path = isUndefined(prefix) ? '/' : prefix;
  return (target: object) => {
    Reflect.defineMetadata(PATH_METADATA, path, target);
  };
}
