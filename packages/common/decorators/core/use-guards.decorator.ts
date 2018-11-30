import { GUARDS_METADATA } from '../../constants';
import { CanActivate } from '../../interfaces';
import { extendArrayMetadata } from '../../utils/extend-metadata.util';
import { isFunction } from '../../utils/shared.utils';
import { validateEach } from '../../utils/validate-each.util';

/**
 * Binds guards to the particular context.
 * When the `@UseGuards()` is used on the controller level:
 * - Guard will be register to each handler (every method)
 *
 * When the `@UseGuards()` is used on the handler level:
 * - Guard will be registered only to the specified method
 *
 * @param  {} ...guards
 */
export function UseGuards(...guards: (CanActivate | Function)[]) {
  return (target: any, key?: string, descriptor?: any) => {
    const isValidGuard = <T extends Function | Record<string, any>>(guard: T) =>
      guard &&
      (isFunction(guard) ||
        isFunction((guard as Record<string, any>).canActivate));

    if (descriptor) {
      validateEach(
        target.constructor,
        guards,
        isValidGuard,
        '@UseGuards',
        'guard',
      );
      extendArrayMetadata(GUARDS_METADATA, guards, descriptor.value);
      return descriptor;
    }
    validateEach(target, guards, isValidGuard, '@UseGuards', 'guard');
    extendArrayMetadata(GUARDS_METADATA, guards, target);
    return target;
  };
}
