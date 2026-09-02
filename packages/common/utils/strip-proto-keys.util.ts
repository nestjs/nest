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
    for (const v of value) {
      stripProtoKeys(v);
    }
    return;
  }

  // Delete dangerous prototype pollution keys
  delete value.__proto__;
  delete value.prototype;

  // Only delete constructor if it's NOT a built-in type
  const constructorType = value?.constructor;
  if (constructorType && !BUILT_IN_TYPES.includes(constructorType)) {
    delete value.constructor;
  }

  for (const key in value) {
    stripProtoKeys(value[key]);
  }
}
