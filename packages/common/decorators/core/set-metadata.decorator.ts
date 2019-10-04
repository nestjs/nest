import { Logger } from '../../services/logger.service';

/**
 * Decorator that assigns metadata to the class/function using the
 * specified `key`.
 *
 * Requires two parameters:
 * - `key` - a value defining the key under which the metadata is stored
 * - `value[]` - array of metadata values to be associated with `key`
 *
 * This metadata can be reflected using the `Reflector` class.
 *
 * Example: `@SetMetadata('roles', ['admin'])`
 *
 * @see [Reflection](https://docs.nestjs.com/guards#reflection)
 *
 * @publicApi
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
