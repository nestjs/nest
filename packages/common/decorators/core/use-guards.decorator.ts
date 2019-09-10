import { GUARDS_METADATA } from '../../constants';
import { CanActivate } from '../../interfaces';
import { extendArrayMetadata } from '../../utils/extend-metadata.util';
import { isFunction } from '../../utils/shared.utils';
import { validateEach } from '../../utils/validate-each.util';

/**
 * Decorator that binds guards to the scope of the controller or method,
 * depending on its context.
 *
 * When `@UseGuards` is used at the controller level, the guard will be
 * applied to every handler (method) in the controller.
 *
 * When `@UseGuards` is used at the individual handler level, the guard
 * will apply only to that specific method.
 *
 * @param guards a single guard instance or class, or a list of guard instances
 * or classes.
 *
 * @see [Guards](https://docs.nestjs.com/guards)
 *
 * @usageNotes
 * Guards can also be set up globally for all controllers and routes
 * using `app.useGlobalGuards()`.  [See here for details](https://docs.nestjs.com/guards#binding-guards)
 *
 * @publicApi
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
