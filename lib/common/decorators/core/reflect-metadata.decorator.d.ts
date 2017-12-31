/**
 * Assigns the metadata to the class / function under specified `key`.
 * This metadata can be reflected using `Reflector` class.
 */
export declare const ReflectMetadata: (metadataKey: any, metadataValue: any) => (target: object, key?: any, descriptor?: any) => any;
