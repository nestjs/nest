export interface LiteralObject {
    [key: string]: any;
}
export interface CacheStore {
    set<T>(key: string, value: T): Promise<void> | void;
    get<T>(key: string): Promise<void> | void;
    del(key: string): void | Promise<void>;
}
export interface CacheStoreFactory {
    create(args: LiteralObject): CacheStore;
}
export interface CacheManagerOptions {
    store?: string | CacheStoreFactory;
    ttl?: number;
    max?: number;
    isCacheableValue?: (value: any) => boolean;
}
