/**
 * Assigns the metadata to the class / function under specified `key`.
 * This metadata can be reflected using `Reflector` class.
 */
export const ReflectMetadata = (metadataKey: string, metadataValue: any) =>
    (target: object, key?: string, descriptor?: any) => {
        if (descriptor) {
            Reflect.defineMetadata(metadataKey, metadataValue, descriptor.value);
            return descriptor;
        }
        Reflect.defineMetadata(metadataKey, metadataValue, target);
        return target;
    };
