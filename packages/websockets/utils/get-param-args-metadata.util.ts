/**
 * Reads the args a param decorator at `index` adds to. An overriding method
 * starts from its parent's args, so the entry inherited at `index` is left out
 * and the override's decorator replaces it.
 *
 * A copy of the helper of `@nestjs/common`, kept here so that this package
 * does not depend on a newer `@nestjs/common` than the one installed.
 */
export function getParamArgsMetadata(
  metadataKey: string,
  target: object,
  key: string | symbol,
  index: number,
): Record<string, { index: number }> {
  const args: Record<string, { index: number }> =
    Reflect.getMetadata(metadataKey, target.constructor, key) || {};
  const inherited =
    Reflect.getMetadata(
      metadataKey,
      Object.getPrototypeOf(target.constructor),
      key,
    ) || {};
  // `assignMetadata` and `assignCustomParameterMetadata` spread shallowly, so
  // an entry the override inherited keeps the parent's reference. If they ever
  // clone entries, this check stops filtering.
  return Object.fromEntries(
    Object.entries(args).filter(
      ([argKey, arg]) => arg.index !== index || arg !== inherited[argKey],
    ),
  );
}
