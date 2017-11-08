import { MEMOIZED_METADATA } from '../../constants';


/**
 * Memoize can caches the return value of methods, and clears the value automatically
 * after the specified time so the next call will recalculate it.
 * @param { expirationTimeMs } number
 */
export function Memoize(expirationTimeMs: number = 60000) {
  return (target: any, propertyName: string, descriptor: TypedPropertyDescriptor<any>) => {
    if (descriptor.value != null) {
      const originalMethod = descriptor.value;
      let fn = function(...args: any[]) {
        if (!fn[MEMOIZED_METADATA]) {
          fn[MEMOIZED_METADATA] = originalMethod.apply(this, args);
          setTimeout(() => clearMemoizedValue(fn), expirationTimeMs);
        }
        return fn[MEMOIZED_METADATA];
      };
      descriptor.value = fn;
      return descriptor;
    }
    else {
      throw 'Only put the @Memoize decorator on a method.';
    }
  }
}

function clearMemoizedValue(method) {
  delete method[MEMOIZED_METADATA];
}
