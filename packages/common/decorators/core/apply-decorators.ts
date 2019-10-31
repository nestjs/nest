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
  ...decorators: Array<ClassDecorator | MethodDecorator>
) {
  return <TFunction extends Function, Y>(
    target: TFunction | Object,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<Y>,
  ) => {
    for (const decorator of decorators || []) {
      target instanceof Function
        ? (decorator as ClassDecorator)(target)
        : (decorator as MethodDecorator)(target, propertyKey, descriptor);
    }
  };
}
