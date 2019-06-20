import { isString, isObject } from '@nestjs/common/utils/shared.utils';

export class MsvcUtil {

    /**
     * Transforms the Pattern to Route.
     * 1. If Pattern is a `string`, it will be returned as it is.
     * 2. If Pattern is a `JSON` object, it will be transformed to Route. For that end,
     * the function will sort properties of `JSON` Object and creates `route` string
     * according to the following template:
     * <key1>:<value1>/<key2>:<value2>/.../<keyN>:<valueN>
     *
     * @param  {any} pattern - client pattern
     * @returns string
     */
    public static transformPatternToRoute(pattern: any): string {
        // Returns the pattern according to the 1st
        if (isString(pattern)) {
            return pattern;
        }

        // Throws the error if the pattern has an incorrect type
        if (!isObject(pattern)) {
            throw new Error(`The pattern must be of type 'string' or 'object'!`);
        }

        // Gets keys of the JSON Pattern and sorts them
        const sortedKeys = Object.keys(pattern)
            .sort((a, b) => ('' + a).localeCompare(b));

        // Creates the array of Pattern params from sorted keys and their corresponding values
        const sortedPatternParams = sortedKeys.map((key) =>
            `${key}:${pattern[key]}`);

        // Creates and returns the Route
        const sortedPattern = sortedPatternParams.join('/');
        return sortedPattern;
    }
}
