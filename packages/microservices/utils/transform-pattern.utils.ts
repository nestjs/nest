import { MsPattern } from '../interfaces/index.js';
import { isObject, isString, isNumber } from '@nestjs/common/internal';

const DEFAULT_MAX_DEPTH = 5;
const DEFAULT_MAX_KEYS = 20;
const DEFAULT_MAX_KEY_LENGTH = 256;
const DEFAULT_MAX_VALUE_LENGTH = 4096;
const DEFAULT_MAX_TOTAL_KEYS = 100;
const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
// Any UTF-16 code unit outside ASCII, surrogates included
const NON_ASCII = /[\u0080-\uffff]/;

/**
 * Sorts the keys of an object of a pattern. localeCompare can take a long
 * time to compare keys of some other characters, e.g. many combining marks
 * on one letter, and a client chooses the keys. So only keys of ASCII
 * characters are compared with it, and any other key goes after them, in
 * code unit order. Routes of patterns whose keys are all ASCII are the same
 * as when every key was compared with localeCompare.
 */
function sortKeys(keys: string[]): string[] {
  const asciiKeys: string[] = [];
  const otherKeys: string[] = [];
  for (const key of keys) {
    (NON_ASCII.test(key) ? otherKeys : asciiKeys).push(key);
  }
  return [
    ...asciiKeys.sort((a, b) => ('' + a).localeCompare(b)),
    ...otherKeys.sort(),
  ];
}

interface PatternLimits {
  maxDepth: number;
  maxKeys: number;
  maxKeyLength: number;
  maxValueLength: number;
  maxTotalKeys: number;
}

type Inspection = { marker: string } | { keys: string[] };
type Inspections = WeakMap<object, { depth: number; inspection: Inspection }>;

const DEFAULT_LIMITS: PatternLimits = {
  maxDepth: DEFAULT_MAX_DEPTH,
  maxKeys: DEFAULT_MAX_KEYS,
  maxKeyLength: DEFAULT_MAX_KEY_LENGTH,
  maxValueLength: DEFAULT_MAX_VALUE_LENGTH,
  maxTotalKeys: DEFAULT_MAX_TOTAL_KEYS,
};

/**
 * Checks one object of a pattern against the limits that apply to each
 * object, and returns either the marker its route is replaced with or its
 * keys. The result is cached, so that walking a pattern again does not list
 * the keys of its objects again.
 */
function inspectObject(
  pattern: object,
  depth: number,
  limits: PatternLimits,
  inspections: Inspections,
): Inspection {
  const cached = inspections.get(pattern);
  if (cached?.depth === depth) {
    return cached.inspection;
  }
  const inspection = inspectObjectUncached(pattern, depth, limits);
  inspections.set(pattern, { depth, inspection });
  return inspection;
}

function inspectObjectUncached(
  pattern: object,
  depth: number,
  limits: PatternLimits,
): Inspection {
  if (depth > limits.maxDepth) {
    return { marker: '[MAX_DEPTH_REACHED]' };
  }
  // Object.keys() would create a string for each item of a long array
  if (Array.isArray(pattern) && pattern.length > limits.maxKeys) {
    return { marker: '[TOO_MANY_KEYS]' };
  }

  const keys = Object.keys(pattern);

  if (keys.length > limits.maxKeys) {
    return { marker: '[TOO_MANY_KEYS]' };
  }

  // localeCompare can take time quadratic in the length of the keys
  if (keys.some(key => key.length > limits.maxKeyLength)) {
    return { marker: '[KEY_TOO_LONG]' };
  }
  return { keys };
}

/**
 * Walks the parts of a pattern its route is built from, until more than
 * "maxTotalKeys" keys have been counted or, with "stopAtMarker", until a
 * part exceeds a limit (a part replaced with a marker is left out
 * otherwise). Returns whether it stopped early. As the limits are checked
 * object by object, its cost does not depend on the size of the pattern.
 */
function walkPattern(
  pattern: unknown,
  depth: number,
  limits: PatternLimits,
  state: { keysLeft: number },
  stopAtMarker: boolean,
  inspections: Inspections,
): boolean {
  if (isString(pattern)) {
    return stopAtMarker && depth > 0 && pattern.length > limits.maxValueLength;
  }
  if (!isObject(pattern)) {
    return false;
  }
  const inspection = inspectObject(pattern, depth, limits, inspections);
  if ('marker' in inspection) {
    return stopAtMarker;
  }
  state.keysLeft -= inspection.keys.length;
  if (state.keysLeft < 0) {
    return true;
  }
  return inspection.keys.some(key =>
    walkPattern(
      pattern[key],
      depth + 1,
      limits,
      state,
      stopAtMarker,
      inspections,
    ),
  );
}

/**
 * Checks whether the route of a client pattern would only say which of its
 * limits it exceeds, without building the route. It stops at the first
 * violation and never lists the items of a long array, so its cost does not
 * depend on the size of the pattern.
 *
 * @param pattern - client pattern
 * @returns boolean
 */
export function exceedsPatternLimits(pattern: unknown): boolean {
  return walkPattern(
    pattern,
    0,
    DEFAULT_LIMITS,
    { keysLeft: DEFAULT_LIMITS.maxTotalKeys },
    true,
    new WeakMap(),
  );
}

/**
 * Transforms the Pattern to Route safely.
 *
 * @param pattern - client pattern
 * @param depth - current recursion depth
 * @param maxDepth - maximum allowed recursion depth
 * @param maxKeys - maximum allowed keys per object
 * @param maxKeyLength - maximum allowed length of a key
 * @param maxValueLength - maximum allowed length of a string value
 * @param maxTotalKeys - maximum allowed keys in the whole pattern
 * @returns string
 */
export function transformPatternToRoute(
  pattern: MsPattern,
  depth = 0,
  maxDepth = DEFAULT_MAX_DEPTH,
  maxKeys = DEFAULT_MAX_KEYS,
  maxKeyLength = DEFAULT_MAX_KEY_LENGTH,
  maxValueLength = DEFAULT_MAX_VALUE_LENGTH,
  maxTotalKeys = DEFAULT_MAX_TOTAL_KEYS,
): string {
  const limits: PatternLimits = {
    maxDepth,
    maxKeys,
    maxKeyLength,
    maxValueLength,
    maxTotalKeys,
  };
  const inspections: Inspections = new WeakMap();
  // The other limits apply to each object, so that objects nested in one
  // another would still make the route as large as the pattern
  if (
    depth === 0 &&
    isObject(pattern) &&
    walkPattern(
      pattern,
      depth,
      limits,
      { keysLeft: maxTotalKeys },
      false,
      inspections,
    )
  ) {
    return '[TOO_MANY_KEYS]';
  }
  return buildRoute(pattern, depth, limits, inspections);
}

function buildRoute(
  pattern: MsPattern,
  depth: number,
  limits: PatternLimits,
  inspections: Inspections,
): string {
  if (isString(pattern) || isNumber(pattern)) {
    return `${pattern}`;
  }

  if (!isObject(pattern)) {
    // For non-string, non-number, non-object values
    return pattern;
  }

  const inspection = inspectObject(pattern, depth, limits, inspections);
  if ('marker' in inspection) {
    return inspection.marker;
  }

  const sortedKeys = sortKeys(inspection.keys);

  const parts = sortedKeys.map(key => {
    const value = pattern[key];
    let partialRoute = `"${escape(key)}":`;

    // Only quote strings, numbers and objects are handled recursively
    if (isString(value)) {
      // The marker is not quoted, so that no string value can produce it
      partialRoute +=
        value.length > limits.maxValueLength
          ? '[VALUE_TOO_LONG]'
          : `"${escape(value)}"`;
    } else {
      partialRoute += buildRoute(value, depth + 1, limits, inspections);
    }

    return partialRoute;
  });

  return `{${parts.join(',')}}`;
}
