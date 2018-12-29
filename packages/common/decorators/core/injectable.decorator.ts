import * as uuid from 'uuid/v4';
import { ScopeOptions } from '../../interfaces/scope-options.interface';
import { SCOPE_OPTIONS_METADATA } from './../../constants';
import { Type } from './../../interfaces/type.interface';

export interface InjectableOptions extends ScopeOptions {}

/**
 * Defines the injectable class. This class can inject dependencies through constructor.
 * Those dependencies have to belong to the same module.
 */
export function Injectable(options?: InjectableOptions): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, options, target);
  };
}

export function mixin(mixinClass: Type<any>) {
  Object.defineProperty(mixinClass, 'name', {
    value: uuid(),
  });
  Injectable()(mixinClass);
  return mixinClass;
}
