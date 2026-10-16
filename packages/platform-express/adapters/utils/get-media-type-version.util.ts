/**
 * Returns the version carried by an `Accept` header for media type versioning,
 * e.g. `2` for `application/json;v=2` with the `v=` key.
 *
 * The version parameter may follow other parameters and may belong to any
 * media range of a list (`text/html, application/json;v=2`); the first match
 * wins. Returns `undefined` when no parameter starts with the key.
 *
 * Quoted parameter values are unescaped, and separators inside them are ignored.
 *
 * Duplicated in each platform package so that a platform package never
 * depends on a newer `@nestjs/core` than the one installed.
 */
export function getMediaTypeVersion(
  acceptHeader: string | string[] | undefined,
  key: string,
): string | undefined {
  // Match quoted strings as a whole, including escaped characters.
  const mediaRanges = ([] as string[])
    .concat(acceptHeader ?? [])
    .flatMap(value => value.match(/(?:[^",]|"(?:\\[\s\S]|[^"\\])*")+/g) ?? []);

  for (const mediaRange of mediaRanges) {
    const [, ...parameters] =
      mediaRange.match(/(?:[^";]|"(?:\\[\s\S]|[^"\\])*")+/g) ?? [];
    for (const parameter of parameters) {
      const trimmedParameter = parameter.trim();
      if (trimmedParameter.startsWith(key)) {
        const version = trimmedParameter.slice(key.length);
        return version.startsWith('"') && version.endsWith('"')
          ? version.slice(1, -1).replace(/\\([\s\S])/g, '$1')
          : version;
      }
    }
  }
  return undefined;
}
