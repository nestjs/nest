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
  ): void => {
    for (const decorator of decorators) {
      if (target instanceof Function && descriptor === undefined && propertyKey === undefined) {
        (decorator as ClassDecorator)(target);
        continue;
      }

      if (propertyKey === undefined) {
        throw new Error('Parameter decorators are not supported in applyDecorators function');
      }

      if (descriptor !== undefined) {
        (decorator as MethodDecorator)(
          target,
          propertyKey,
          descriptor,
        );
        continue;
      }

      (decorator as PropertyDecorator)(
        target,
        propertyKey,
      );
    }
  };
}
