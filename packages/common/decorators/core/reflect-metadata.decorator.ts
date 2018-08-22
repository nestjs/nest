/**
 * Assigns the metadata to the class/function under specified `key`.
 * This metadata can be reflected using `Reflector` class.
 */
export const ReflectMetadata = <K = any, V = any>(metadataKey: K, metadataValue: V) => (
  target: object,
  key?,
  descriptor?,
) => {
  if (descriptor) {
    Reflect.defineMetadata(metadataKey, metadataValue, descriptor.value);
    return descriptor;
  }
  Reflect.defineMetadata(metadataKey, metadataValue, target);
  return target;
};
