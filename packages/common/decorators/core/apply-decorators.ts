import { isUndefined } from '../../utils/shared.utils.js';

/**
 * Function that returns a new decorator that applies all decorators provided by param
 *
 * Useful to build new decorators (or a decorator factory) encapsulating multiple decorators related with the same feature
 *
 * @param decorators one or more decorators (e.g., `ApplyGuard(...)`)
 *
 * @publicApi
 */
export function applyDecorators(
  ...decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator>
) {
  return <TFunction extends Function, Y>(
    target: TFunction | object,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<Y>,
  ) => {
    // A class decorator gets the constructor alone. A decorator of a static
    // member gets the constructor too, along with the member's key.
    if (target instanceof Function && isUndefined(propertyKey)) {
      let decorated = target;
      for (const decorator of decorators) {
        // As TypeScript does, a class returned by a decorator replaces the
        // decorated one for the decorators that follow
        decorated =
          ((decorator as ClassDecorator)(decorated) as TFunction | void) ??
          decorated;
      }
      return decorated;
    }
    // A property has no descriptor to replace, and a decorator such as
    // `SetMetadata()` returns the target there, which must not be taken for one
    if (isUndefined(descriptor)) {
      for (const decorator of decorators) {
        (decorator as PropertyDecorator)(target, propertyKey!);
      }
      return;
    }
    let decorated = descriptor;
    for (const decorator of decorators) {
      // As TypeScript does, a descriptor returned by a method decorator
      // replaces the one the decorators that follow get
      decorated =
        ((decorator as MethodDecorator)(
          target,
          propertyKey!,
          decorated,
        ) as TypedPropertyDescriptor<Y> | void) ?? decorated;
    }
    return decorated;
  };
}
