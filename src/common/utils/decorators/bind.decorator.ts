/**
 * Binds parameters decorators to the method
 * Useful when the language doesn't provide a 'Parameter Decorators' feature
 * @param  {} ...decorators
 */
export function Bind(...decorators) {
  return (target: object, key, descriptor) => {
    decorators.forEach((fn, index) => fn(target, key, index));
    return descriptor;
  };
}
