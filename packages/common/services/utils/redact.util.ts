export const DEFAULT_REDACT_CENSOR = '[REDACTED]';

const CIRCULAR = '[Circular]';

/**
 * Returns a copy of the value in which the properties matching the paths are
 * replaced with the censor, or the value itself when nothing matched.
 */
export type Redactor = (value: unknown) => unknown;

/**
 * Creates a function that masks properties of logged values.
 *
 * - A path without dots (`password`) matches a property with that name at any
 *   depth.
 * - A dotted path (`user.password`) matches when the last keys leading to a
 *   property are those keys, at any depth. Array indices are not keys, so
 *   `users.password` also matches `{ users: [{ password }] }`.
 * - Keys are compared case-insensitively.
 *
 * Plain objects, arrays, class instances, errors (including `cause` and
 * `AggregateError#errors`), `Map`s (string keys) and `Set`s are traversed.
 * Only the objects on the way to a redacted property are copied; the rest is
 * returned as is, and the input is never mutated. A circular reference is
 * replaced with `"[Circular]"` (so the objects on the cycle are copied too). If
 * the value can't be traversed (for example, a getter throws), the whole value
 * is replaced with the censor.
 *
 * @returns `undefined` when there is nothing to redact.
 */
export function createRedactor(
  paths: string[],
  censor: string = DEFAULT_REDACT_CENSOR,
): Redactor | undefined {
  const keys = new Set<string>();
  const dottedPaths: string[][] = [];
  for (const path of paths) {
    const segments = path
      .split('.')
      .map(segment => segment.trim().toLowerCase())
      .filter(segment => segment.length > 0);
    if (segments.length === 1) {
      keys.add(segments[0]);
    } else if (segments.length > 1) {
      dottedPaths.push(segments);
    }
  }
  if (keys.size === 0 && dottedPaths.length === 0) {
    return undefined;
  }

  return (value: unknown) => {
    // Lower-cased keys from the root to the value being visited.
    const path: string[] = [];
    // Objects on that path, to detect circular references.
    const ancestors: object[] = [];

    const isRedacted = (key: string): boolean => {
      if (keys.has(key)) {
        return true;
      }
      return dottedPaths.some(segments => {
        const last = segments.length - 1;
        if (segments[last] !== key || last > path.length) {
          return false;
        }
        for (let i = 1; i <= last; i++) {
          if (segments[last - i] !== path[path.length - i]) {
            return false;
          }
        }
        return true;
      });
    };

    // Each call starts with a fresh "path" and "ancestors", so an exception
    // (caught below) doesn't need to restore them.
    const visitProperty = (key: string, propertyValue: unknown) => {
      const normalizedKey = key.toLowerCase();
      if (isRedacted(normalizedKey)) {
        return censor;
      }
      if (typeof propertyValue !== 'object' || propertyValue === null) {
        return propertyValue;
      }
      path.push(normalizedKey);
      const redacted = visit(propertyValue);
      path.pop();
      return redacted;
    };

    const visit = (current: unknown): unknown => {
      if (typeof current !== 'object' || current === null) {
        return current;
      }
      if (ancestors.includes(current)) {
        return CIRCULAR;
      }
      let redacted: unknown;
      ancestors.push(current);
      if (Array.isArray(current)) {
        redacted = redactArray(current);
      } else if (Object.getPrototypeOf(current) === Object.prototype) {
        redacted = redactObject(current);
      } else if (current instanceof Map) {
        redacted = redactMap(current);
      } else if (current instanceof Set) {
        redacted = redactSet(current);
      } else if (isOpaque(current)) {
        redacted = current;
      } else {
        redacted = redactObject(current);
      }
      ancestors.pop();
      return redacted;
    };

    const redactArray = (array: unknown[]) => {
      let copy: unknown[] | undefined;
      for (let i = 0; i < array.length; i++) {
        const redacted = visit(array[i]);
        if (!Object.is(redacted, array[i])) {
          copy ??= array.slice();
          copy[i] = redacted;
        }
      }
      return copy ?? array;
    };

    const redactMap = (map: Map<unknown, unknown>) => {
      let changed = false;
      const entries: [unknown, unknown][] = [];
      for (const [key, entryValue] of map) {
        const redacted =
          typeof key === 'string'
            ? visitProperty(key, entryValue)
            : visit(entryValue);
        changed ||= !Object.is(redacted, entryValue);
        entries.push([key, redacted]);
      }
      return changed ? new Map(entries) : map;
    };

    const redactSet = (set: Set<unknown>) => {
      let changed = false;
      const values: unknown[] = [];
      for (const setValue of set) {
        const redacted = visit(setValue);
        changed ||= !Object.is(redacted, setValue);
        values.push(redacted);
      }
      return changed ? new Set(values) : set;
    };

    const redactObject = (object: object) => {
      const source = object as Record<string, unknown>;
      const keysToVisit = Object.keys(source);
      if (object instanceof Error) {
        // Non-enumerable, but part of the logged error.
        for (const key of ['cause', 'errors']) {
          if (
            Object.prototype.hasOwnProperty.call(object, key) &&
            !keysToVisit.includes(key)
          ) {
            keysToVisit.push(key);
          }
        }
      }

      let changes: Map<string, unknown> | undefined;
      for (const key of keysToVisit) {
        const original = source[key];
        const redacted = visitProperty(key, original);
        if (!Object.is(redacted, original)) {
          changes ??= new Map();
          changes.set(key, redacted);
        }
      }
      if (!changes) {
        return object;
      }
      if (Object.getPrototypeOf(object) === Object.prototype) {
        const copy: Record<string, unknown> = { ...source };
        for (const [key, redacted] of changes) {
          if (key === '__proto__') {
            // An assignment would call the "__proto__" setter.
            Object.defineProperty(copy, key, {
              value: redacted,
              enumerable: true,
              writable: true,
              configurable: true,
            });
          } else {
            copy[key] = redacted;
          }
        }
        return copy;
      }
      // Keeps the prototype and the other properties (including the
      // non-enumerable "message" and "stack" of errors).
      const descriptors = Object.getOwnPropertyDescriptors(object);
      if (object instanceof Error && descriptors.stack?.get) {
        // V8 may define "stack" as an accessor that only works on the
        // original error.
        descriptors.stack = {
          value: object.stack,
          enumerable: descriptors.stack.enumerable,
          writable: true,
          configurable: true,
        };
      }
      for (const [key, redacted] of changes) {
        descriptors[key] = {
          value: redacted,
          enumerable: descriptors[key].enumerable,
          writable: true,
          configurable: true,
        };
      }
      return Object.create(Object.getPrototypeOf(object), descriptors);
    };

    try {
      return visit(value);
    } catch {
      return censor;
    }
  };
}

/**
 * Objects whose content isn't made of properties worth traversing.
 */
function isOpaque(value: object): boolean {
  return (
    value instanceof Date ||
    value instanceof RegExp ||
    value instanceof Promise ||
    value instanceof WeakMap ||
    value instanceof WeakSet ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value)
  );
}
