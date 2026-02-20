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
  // Prevent excessively deep recursion
  if (depth > maxDepth) {
    return '"[MAX_DEPTH_REACHED]"';
  }

  if (isString(pattern) || isNumber(pattern)) {
    return `${pattern}`;
  }

  if (!isObject(pattern)) {
    return `"${String(pattern)}"`;
  }

  const keys = Object.keys(pattern);

  // Limit number of keys to prevent huge objects
  if (keys.length > maxKeys) {
    return '"[TOO_MANY_KEYS]"';
  }

  const sortedKeys = keys.sort((a, b) => ('' + a).localeCompare(b));

  const sortedPatternParams = sortedKeys.map(key => {
    const value = pattern[key];
    const partialRoute = `"${key}":${transformPatternToRoute(
      value,
      depth + 1,
      maxDepth,
      maxKeys,
    )}`;
    return partialRoute;
  });

  return `{${sortedPatternParams.join(',')}}`;
}
