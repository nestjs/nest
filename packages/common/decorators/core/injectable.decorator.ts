import * as uuid from 'uuid/v4';
import { Type } from './../../interfaces/type.interface';

/**
 * Defines the injectable class. This class can inject dependencies through constructor.
 * Those dependencies have to belong to the same module.
 */
export function Injectable(): ClassDecorator {
  return (target: object) => {};
}

export function mixin(mixinClass: Type<any>) {
  Object.defineProperty(mixinClass, 'name', {
    value: uuid(),
  });
  Injectable()(mixinClass);
  return mixinClass;
}
