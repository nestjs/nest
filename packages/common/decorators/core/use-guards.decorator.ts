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
 * @see [Guards](https://docs.nestjs.com/guards)
 *
 * @usageNotes
 *
 * ### Passing a guard by type
 * In this example, we pass a guard type, which will delegate instantiating
 * the guard to the Nest framework, and will allow Dependency Injection.
 *
 * ```typescript
 * @Controller('cats')
 * @UseGuards(RolesGuard)
 * export class CatsController {}
 * ```
 *
 * ### Passing a guard instance
 * It's also possible to pass an instance of a guard directly to the decorator.
 *
 * ```typescript
 * @Controller('cats')
 * @UseGuards(new RolesGuard())
 * export class CatsController {}
 * ```
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
