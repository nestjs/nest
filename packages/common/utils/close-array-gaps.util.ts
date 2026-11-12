import { types } from 'util';

/**
 * Built-in types whose contents are not plain data, skipped as
 * `stripProtoKeys()` skips them.
 */
const BUILT_IN_TYPES = [Date, RegExp, Error, Map, Set, WeakMap, WeakSet];

const MAX_ARRAY_INDEX = 2 ** 32 - 2;

/** Whether `key`, one of `Object.keys()` of an array, is an index. */
function isArrayIndex(key: string): boolean {
  const index = Number(key);
  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index <= MAX_ARRAY_INDEX &&
    String(index) === key
  );
}

/**
 * Returns the items of `array` in order, without its gaps (`[, 'a', , 'b']`
 * gives `['a', 'b']`), as a new array, or `array` itself when it has none.
 * The work depends on the number of items rather than on the length, which
 * a sparse array (e.g. one built from a multipart field named `tags[1000]`)
 * may set far beyond it.
 */
export function withoutArrayGaps<T>(array: T[]): T[] {
  const indexes = Object.keys(array).filter(isArrayIndex);
  if (indexes.length === array.length) {
    return array;
  }
  return indexes.map(index => array[index as unknown as number]);
}

/**
 * Closes the gaps of the sparse arrays in `value`, in place, keeping the
 * order of the items, as `qs` does for a urlencoded body. A copy of a sparse
 * array made by `forEach()` or `map()` (as class-transformer makes) skips
 * the gaps, so the copy would not be the array it was made from. Arrays
 * that cannot be changed (frozen or sealed) are left as they are.
 *
 * Like `stripProtoKeys()`, the traversal keeps its own stack and visits
 * each object once.
 */
export function closeArrayGaps(value: unknown): void {
  const visited = new WeakSet<object>();
  const stack = [value];

  while (stack.length > 0) {
    const current = stack.pop();

    if (
      current === null ||
      typeof current !== 'object' ||
      types.isTypedArray(current) ||
      visited.has(current)
    ) {
      continue;
    }
    visited.add(current);

    if (BUILT_IN_TYPES.some(type => current instanceof type)) {
      continue;
    }

    if (Array.isArray(current)) {
      const items = withoutArrayGaps(current);
      if (items !== current && Object.isExtensible(current)) {
        items.forEach((item, index) => (current[index] = item));
        current.length = items.length;
      }
      for (const item of items) {
        stack.push(item);
      }
      continue;
    }

    for (const key of Object.keys(current)) {
      stack.push((current as Record<string, unknown>)[key]);
    }
  }
}
