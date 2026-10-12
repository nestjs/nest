/**
 * Returns the version carried by an `Accept` header for media type versioning,
 * e.g. `2` for `application/json;v=2` with the `v=` key.
 *
 * The version parameter may follow other parameters and may belong to any
 * media range of a list (`text/html, application/json;v=2`); the first match
 * wins. Returns `undefined` when no parameter starts with the key.
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
    .flatMap(value => value.split(','));

  for (const mediaRange of mediaRanges) {
    const [, ...parameters] = mediaRange.split(';');
    for (const parameter of parameters) {
      const trimmedParameter = parameter.trim();
      if (trimmedParameter.startsWith(key)) {
        return trimmedParameter.slice(key.length);
      }
    }
  }
  return undefined;
}
