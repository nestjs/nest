import { types } from 'util';

/**
 * Built-in JavaScript types that should be excluded from prototype stripping
 * to avoid conflicts with test frameworks like Jest's useFakeTimers
 */
const BUILT_IN_TYPES = [Date, RegExp, Error, Map, Set, WeakMap, WeakSet];

/**
 * Strips dangerous prototype pollution keys (__proto__, prototype, constructor)
 * from an object recursively.
 */
export function stripProtoKeys(value: any): void {
  if (value == null || typeof value !== 'object' || types.isTypedArray(value)) {
    return;
  }

  // Skip built-in JavaScript primitives to avoid Jest useFakeTimers conflicts
  if (BUILT_IN_TYPES.some(type => value instanceof type)) {
    return;
  }

  if (Array.isArray(value)) {
    // Only the items that are present: the length of a sparse array (e.g.
    // one built from a multipart field named `tags[4294967294]`) can be far
    // beyond its number of items, and a loop over every index would block
    // the event loop for as long. `Object.values()` skips the holes.
    for (const v of Object.values(value)) {
      stripProtoKeys(v);
    }
    return;
  }

  // Delete dangerous prototype pollution keys
  delete value.__proto__;
  delete value.prototype;

  // Only delete constructor if it's NOT a built-in type, whatever its value:
  // a falsy one (null, 0, false, "") shadows the prototype's all the same
  if (!BUILT_IN_TYPES.includes(value.constructor)) {
    delete value.constructor;
  }

  for (const key in value) {
    stripProtoKeys(value[key]);
  }
}
