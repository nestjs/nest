/**
 * Decorator that binds *parameter decorators* to the method that follows.
 *
 * Useful when the language doesn't provide a 'Parameter Decorator' feature
 * (i.e., vanilla JavaScript).
 *
 * @param decorators one or more parameter decorators (e.g., `Req()`)
 *
 * @publicApi
 */
export function Bind(...decorators: any[]): MethodDecorator {
  return <T>(
    target: object,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ) => {
    decorators.forEach((fn, index) => fn(target, key, index));
    return descriptor;
  };
}
