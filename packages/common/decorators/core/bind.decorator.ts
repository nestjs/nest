/**
 * Binds parameter decorators to the method
 * Useful when the language doesn't provide a 'Parameter Decorators' feature (vanilla JavaScript)
 * @param  {} ...decorators
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
