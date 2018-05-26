"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Assigns the metadata to the class/function under specified `key`.
 * This metadata can be reflected using `Reflector` class.
 */
exports.ReflectMetadata = (metadataKey, metadataValue) => (target, key, descriptor) => {
    if (descriptor) {
        Reflect.defineMetadata(metadataKey, metadataValue, descriptor.value);
        return descriptor;
    }
    Reflect.defineMetadata(metadataKey, metadataValue, target);
    return target;
};
