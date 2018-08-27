"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const cache_constants_1 = require("../../cache/cache.constants");
const cache_providers_1 = require("../../cache/cache.providers");
describe('createCacheManager', () => {
    it('should create provider', () => {
        const cacheManager = cache_providers_1.createCacheManager();
        chai_1.expect(cacheManager.provide).to.be.eql(cache_constants_1.CACHE_MANAGER);
        chai_1.expect(cacheManager.inject).to.contain(cache_constants_1.CACHE_MODULE_OPTIONS);
    });
    it('should create cache manager', () => {
        const cacheManager = cache_providers_1.createCacheManager();
        const manager = cacheManager.useFactory({});
        chai_1.expect(manager).to.be.an('object');
    });
});
