/**
 * Similar to `Object.assign` but copying properties descriptors from `source`
 * as well.
 */
export function assignToObject<T, U>(target: T, source: U): T & U {
  Object.defineProperties(
    target,
    Object.keys(source).reduce((descriptors, key) => {
      descriptors[key] = Object.getOwnPropertyDescriptor(source, key);
      return descriptors;
    }, Object.create(null)),
  );
  return target as T & U;
}
