import { MsPattern } from '../interfaces/index.js';
import { isObject, isString, isNumber } from '@nestjs/common/internal';

const DEFAULT_MAX_DEPTH = 5;
const DEFAULT_MAX_KEYS = 20;
const DEFAULT_MAX_KEY_LENGTH = 256;
const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * Transforms the Pattern to Route safely.
 *
 * @param pattern - client pattern
 * @param depth - current recursion depth
 * @param maxDepth - maximum allowed recursion depth
 * @param maxKeys - maximum allowed keys per object
 * @param maxKeyLength - maximum allowed length of a key
 * @returns string
 */
export function transformPatternToRoute(
  pattern: MsPattern,
  depth = 0,
  maxDepth = DEFAULT_MAX_DEPTH,
  maxKeys = DEFAULT_MAX_KEYS,
  maxKeyLength = DEFAULT_MAX_KEY_LENGTH,
): string {
  if (isString(pattern) || isNumber(pattern)) {
    return `${pattern}`;
  }

  if (!isObject(pattern)) {
    // For non-string, non-number, non-object values
    return pattern;
  }

  if (depth > maxDepth) {
    return '[MAX_DEPTH_REACHED]';
  }

  const keys = Object.keys(pattern);

  if (keys.length > maxKeys) {
    return '[TOO_MANY_KEYS]';
  }

  // localeCompare can take time quadratic in the length of the keys
  if (keys.some(key => key.length > maxKeyLength)) {
    return '[KEY_TOO_LONG]';
  }

  const sortedKeys = keys.sort((a, b) => ('' + a).localeCompare(b));

  const parts = sortedKeys.map(key => {
    const value = pattern[key];
    let partialRoute = `"${escape(key)}":`;

    // Only quote strings, numbers and objects are handled recursively
    if (isString(value)) {
      partialRoute += `"${escape(transformPatternToRoute(value, depth + 1, maxDepth, maxKeys, maxKeyLength))}"`;
    } else {
      partialRoute += transformPatternToRoute(
        value,
        depth + 1,
        maxDepth,
        maxKeys,
        maxKeyLength,
      );
    }

    return partialRoute;
  });

  return `{${parts.join(',')}}`;
}
