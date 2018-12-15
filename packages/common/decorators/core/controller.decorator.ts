import { PATH_METADATA, SCOPE_OPTIONS_METADATA } from '../../constants';
import { isObject, isUndefined } from '../../utils/shared.utils';
import { ScopeOptions } from './../../interfaces/scope-options.interface';

export interface ControllerOptions extends ScopeOptions {}

/**
 * Defines the controller. Controller can inject dependencies through constructor.
 * Those dependencies have to belong to the same module.
 */
export function Controller(prefix?: string): ClassDecorator;
export function Controller(options?: ControllerOptions): ClassDecorator;
export function Controller(
  prefix?: string,
  options?: ControllerOptions,
): ClassDecorator;
export function Controller(
  prefixOrOptions?: string | ControllerOptions,
  options?: ControllerOptions,
): ClassDecorator {
  const [prefix, controllerOptions] = isObject(prefixOrOptions)
    ? [undefined, prefixOrOptions]
    : [prefixOrOptions, options];

  const path = isUndefined(prefix) ? '/' : prefix;
  return (target: object) => {
    Reflect.defineMetadata(PATH_METADATA, path, target);
    Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, controllerOptions, target);
  };
}
