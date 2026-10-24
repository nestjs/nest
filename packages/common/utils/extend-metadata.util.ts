export function extendArrayMetadata<T extends Array<unknown>>(
  key: string,
  metadata: T,
  target: Function,
) {
  const previousValue = Reflect.getMetadata(key, target) || [];
  const value = [...previousValue, ...metadata];
  Reflect.defineMetadata(key, value, target);
}

/**
 * Reads the args a param decorator at `index` adds to. An overriding method
 * starts from its parent's args, so the entry inherited at `index` is left out
 * and the override's decorator replaces it.
 *
 * @internal
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
  return Object.fromEntries(
    Object.entries(args).filter(
      ([argKey, arg]) => arg.index !== index || arg !== inherited[argKey],
    ),
  );
}
