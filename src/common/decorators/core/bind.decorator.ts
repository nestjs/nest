/**
 * Binds parameters decorators to the method
 * Useful when the language doesn't provide a 'Parameter Decorators' feature
 * @param  {} ...decorators
 */
export function Bind(...decorators: any[]) {
  return (target: object, key: string, descriptor: any) => {
    decorators.forEach((fn, index) => fn(target, key, index));
    return descriptor;
  };
}
