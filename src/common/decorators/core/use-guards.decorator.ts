import { GUARDS_METADATA } from '../../constants';

/**
 * Binds guards to the particular context.
 * When the `@UseGuards()` is used on the controller level:
 * - Guard will be register to each handler (every method)
 *
 * When the `@UseGuards()` is used on the handler level:
 * - Guard will be registered only to specified method
 *
 * @param  {} ...guards (types)
 */
export function UseGuards(...guards) {
  return (target: object, key?, descriptor?) => {
    if (descriptor) {
      Reflect.defineMetadata(GUARDS_METADATA, guards, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(GUARDS_METADATA, guards, target);
    return target;
  };
}
