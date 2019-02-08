import { PATH_METADATA, SCOPE_OPTIONS_METADATA } from '../../constants';
import { isString, isUndefined } from '../../utils/shared.utils';
import { ScopeOptions } from './../../interfaces/scope-options.interface';

export interface ControllerOptions extends ScopeOptions {
  path?: string;
}

/**
 * Defines the controller. Controller can inject dependencies through constructor.
 * Those dependencies have to belong to the same module.
 */
export function Controller();
export function Controller(prefix: string);
export function Controller(options: ControllerOptions);
export function Controller(
  prefixOrOptions?: string | ControllerOptions,
): ClassDecorator {
  const defaultPath = '/';
  const [path, scopeOptions] = isUndefined(prefixOrOptions)
    ? [defaultPath, undefined]
    : isString(prefixOrOptions)
      ? [prefixOrOptions, undefined]
      : [prefixOrOptions.path || defaultPath, { scope: prefixOrOptions.scope }];

  return (target: object) => {
    Reflect.defineMetadata(PATH_METADATA, path, target);
    Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, scopeOptions, target);
  };
}
