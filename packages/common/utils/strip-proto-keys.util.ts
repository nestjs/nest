import { types } from 'util';

/**
 * Built-in JavaScript types that should be excluded from prototype stripping
 * to avoid conflicts with test frameworks like Jest's useFakeTimers
 */
const BUILT_IN_TYPES = [Date, RegExp, Error, Map, Set, WeakMap, WeakSet];

/**
 * Strips dangerous prototype pollution keys (__proto__, prototype, constructor)
 * from an object recursively.
 *
 * The traversal keeps its own stack instead of calling itself, so a value
 * nested deeper than the call stack does not throw a `RangeError`, and it
 * skips the objects it has already visited, so a value with a cycle (e.g. an
 * entity with a two-way relation) is walked once instead of forever.
 */
export function stripProtoKeys(value: any): void {
  const visited = new WeakSet<object>();
  const stack = [value];

  while (stack.length > 0) {
    const current = stack.pop();

    if (
      current == null ||
      typeof current !== 'object' ||
      types.isTypedArray(current) ||
      visited.has(current)
    ) {
      continue;
    }
    visited.add(current);

    // Skip built-in JavaScript primitives to avoid Jest useFakeTimers conflicts
    if (BUILT_IN_TYPES.some(type => current instanceof type)) {
      continue;
    }

    if (Array.isArray(current)) {
      // Only the items that are present: the length of a sparse array (e.g.
      // one built from a multipart field named `tags[4294967294]`) can be far
      // beyond its number of items, and a loop over every index would block
      // the event loop for as long. `Object.values()` skips the holes.
      for (const item of Object.values(current)) {
        stack.push(item);
      }
      continue;
    }

    // Delete dangerous prototype pollution keys
    delete current.__proto__;
    delete current.prototype;

    // Only delete constructor if it's NOT a built-in type, whatever its value:
    // a falsy one (null, 0, false, "") shadows the prototype's all the same
    if (!BUILT_IN_TYPES.includes(current.constructor)) {
      delete current.constructor;
    }

    for (const key in current) {
      stack.push(current[key]);
    }
  }
}
