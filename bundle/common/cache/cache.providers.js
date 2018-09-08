"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const load_package_util_1 = require("../utils/load-package.util");
const cache_constants_1 = require("./cache.constants");
const default_options_1 = require("./default-options");
function createCacheManager() {
    return {
        provide: cache_constants_1.CACHE_MANAGER,
        useFactory: (options) => {
            const cacheManager = load_package_util_1.loadPackage('cache-manager', 'CacheModule');
            const memoryCache = cacheManager.caching(Object.assign({}, default_options_1.defaultCacheOptions, (options || {})));
            return memoryCache;
        },
        inject: [cache_constants_1.CACHE_MODULE_OPTIONS],
    };
}
exports.createCacheManager = createCacheManager;
