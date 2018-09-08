/**
 * Assigns the metadata to the class/function under specified `key`.
 * This metadata can be reflected using `Reflector` class.
 */
export declare const ReflectMetadata: <K = any, V = any>(metadataKey: K, metadataValue: V) => (target: object, key?: any, descriptor?: any) => any;
