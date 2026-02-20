import {
  isNumber,
  isObject,
  isString,
} from '@nestjs/common/utils/shared.utils';
import { MsPattern } from '../interfaces';

const DEFAULT_MAX_DEPTH = 5;
const DEFAULT_MAX_KEYS = 20;

/**
 * Transforms the Pattern to Route safely.
 *
 * @param pattern - client pattern
 * @param depth - current recursion depth
 * @param maxDepth - maximum allowed recursion depth
 * @param maxKeys - maximum allowed keys per object
 * @returns string
 */
export function transformPatternToRoute(
  pattern: MsPattern,
  depth = 0,
  maxDepth = DEFAULT_MAX_DEPTH,
  maxKeys = DEFAULT_MAX_KEYS,
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

  const sortedKeys = keys.sort((a, b) => ('' + a).localeCompare(b));

  const parts = sortedKeys.map(key => {
    const value = pattern[key];
    let partialRoute = `"${key}":`;

    // Only quote strings, numbers and objects are handled recursively
    if (isString(value)) {
      partialRoute += `"${transformPatternToRoute(value, depth + 1, maxDepth, maxKeys)}"`;
    } else {
      partialRoute += transformPatternToRoute(
        value,
        depth + 1,
        maxDepth,
        maxKeys,
      );
    }

    return partialRoute;
  });

  return `{${parts.join(',')}}`;
}
