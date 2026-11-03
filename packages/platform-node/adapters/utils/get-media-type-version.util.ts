/**
 * Splits a header value at separators outside quoted strings in linear time.
 * Backslash-escaped characters inside quoted strings are treated as literals.
 */
const splitOutsideQuotes = (value: string, separator: ',' | ';'): string[] => {
  const parts: string[] = [];
  let start = 0;
  let isQuoted = false;
  const len = value.length;
  for (let index = 0; index < len; index++) {
    const character = value[index];
    if (isQuoted && character === '\\') {
      // A quoted-pair consumes the next character, including an escaped quote.
      index++;
    } else if (character === '"') {
      isQuoted = !isQuoted;
    } else if (character === separator && !isQuoted) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(value.slice(start));
  return parts;
};

/**
 * Returns the version carried by an `Accept` header for media type versioning,
 * e.g. `2` for `application/json;v=2` with the `v=` key.
 *
 * The version parameter may follow other parameters and may belong to any
 * media range of a list (`text/html, application/json;v=2`); the first match
 * wins. Returns `undefined` when no parameter starts with the key.
 *
 * Quoted parameter values are unescaped, and separators inside them are ignored.
 * An unterminated quoted string runs to the end of the header value, so a
 * version that follows its opening quote is not read.
 *
 * Duplicated in each platform package so that a platform package never
 * depends on a newer `@nestjs/core` than the one installed.
 */
export function getMediaTypeVersion(
  acceptHeader: string | string[] | undefined,
  key: string,
): string | undefined {
  const mediaRanges = ([] as string[])
    .concat(acceptHeader ?? [])
    .flatMap(value => splitOutsideQuotes(value, ','));

  for (const mediaRange of mediaRanges) {
    const [, ...parameters] = splitOutsideQuotes(mediaRange, ';');
    for (const parameter of parameters) {
      const trimmedParameter = parameter.trim();
      if (trimmedParameter.startsWith(key)) {
        const version = trimmedParameter.slice(key.length);
        if (version.startsWith('"') && version.endsWith('"')) {
          return version.slice(1, -1).replace(/\\([\s\S])/g, '$1');
        }
        return version;
      }
    }
  }
  return undefined;
}
