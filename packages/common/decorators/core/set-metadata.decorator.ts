export type CustomDecorator<TKey = string> = MethodDecorator &
  ClassDecorator & PropertyDecorator & {
    KEY: TKey;
  };

/**
 * Decorator that assigns metadata to the class/function/params using the
 * specified `key`.
 *
 * Requires two parameters:
 * - `key` - a value defining the key under which the metadata is stored
 * - `value` - metadata to be associated with `key`
 *
 * This metadata can be reflected using the `Reflector` class.
 *
 * Example: `@SetMetadata('roles', ['admin'])`
 *
 * @see [Reflection](https://docs.nestjs.com/guards#reflection)
 *
 * @publicApi
 */
export const SetMetadata = <K = string, V = any>(
  metadataKey: K,
  metadataValue: V,
): CustomDecorator<K> => {
  const decoratorFactory = (target: object, key?: any, descriptorOrIndex?: any) => {
    if (typeof descriptorOrIndex == "object") {
      const descriptor = descriptorOrIndex;
      Reflect.defineMetadata(metadataKey, metadataValue, descriptor.value);
      return descriptor;
    }

    if (typeof descriptorOrIndex === "number") {
      const index = descriptorOrIndex;
			const func = (target as any)[key] as Function;
			let existingMetadata: V[] = Reflect.getMetadata(`param:${metadataKey}`, func) || [];
			if (!Array.isArray(existingMetadata))
				existingMetadata = [existingMetadata];
			existingMetadata[index] = metadataValue;
			Reflect.defineMetadata(`param:${metadataKey}`, existingMetadata, func);
			return target;
    }

    Reflect.defineMetadata(metadataKey, metadataValue, target);
    return target;
  };
  
  decoratorFactory.KEY = metadataKey;
  return decoratorFactory;
};
