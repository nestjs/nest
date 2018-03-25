import { GUARDS_METADATA } from '../../constants';
import { extendArrayMetadata } from '../../utils/extend-metadata.util';
import { validateEach } from '../../utils/validate-each.util';
import { isFunction } from '../../utils/shared.utils';

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
export function UseGuards(...guards: any[]) {
  return (target: any, key?, descriptor?) => {
    if (descriptor) {
      validateEach(target.constructor, guards, isFunction, '@UseGuards', 'guard');
      extendArrayMetadata(GUARDS_METADATA, guards, descriptor.value);
      return descriptor;
    }
    validateEach(target, guards, isFunction, '@UseGuards', 'guard');
    extendArrayMetadata(GUARDS_METADATA, guards, target);
    return target;
  };
}
