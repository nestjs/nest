import { isObject, isString } from '@nestjs/common/utils/shared.utils';
import { MsPattern } from '../interfaces';

/**
 * Transforms the Pattern to Route.
 * 1. If Pattern is a `string`, it will be returned as it is.
 * 2. If Pattern is a `number`, it will be converted to `string`.
 * 3. If Pattern is a `JSON` object, it will be transformed to Route. For that end,
 * the function will sort properties of `JSON` Object and creates `route` string
 * according to the following template:
 * <key1>:<value1>/<key2>:<value2>/.../<keyN>:<valueN>
 *
 * @param  {MsPattern} pattern - client pattern
 * @returns string
 */
export function transformPatternToRoute(pattern: MsPattern): string {
  if (isString(pattern) || typeof pattern === 'number') {
    return `${pattern}`;
  }
  if (!isObject(pattern)) {
    return pattern;
  }

  const sortedKeys = Object.keys(pattern).sort((a, b) =>
    ('' + a).localeCompare(b),
  );

  // Creates the array of Pattern params from sorted keys and their corresponding values
  const sortedPatternParams = sortedKeys.map(key => {
    let partialRoute = `"${key}":`;
    partialRoute += isString(pattern[key])
      ? `"${transformPatternToRoute(pattern[key])}"`
      : transformPatternToRoute(pattern[key]);
    return partialRoute;
  });

  const route = sortedPatternParams.join(',');
  return `{${route}}`;
}
