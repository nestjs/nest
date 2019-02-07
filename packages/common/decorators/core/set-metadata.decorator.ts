import { Logger } from './../../services/logger.service';

/**
 * Assigns the metadata to the class/function under specified `key`.
 * This metadata can be reflected using `Reflector` class.
 */
export const SetMetadata = <K = any, V = any>(
  metadataKey: K,
  metadataValue: V,
) => (target: object, key?: any, descriptor?: any) => {
  if (descriptor) {
    Reflect.defineMetadata(metadataKey, metadataValue, descriptor.value);
    return descriptor;
  }
  Reflect.defineMetadata(metadataKey, metadataValue, target);
  return target;
};

const logger = new Logger('ReflectMetadata');
/**
 * @deprecated
 */
export const ReflectMetadata = <K = any, V = any>(
  metadataKey: K,
  metadataValue: V,
) => {
  logger.warn(
    `DEPRECATED! The @ReflectMetadata() decorator has been deprecated within the 6.0.0 release. Please, use @SetMetadata() instead.`,
  );
  return SetMetadata(metadataKey, metadataValue);
};
