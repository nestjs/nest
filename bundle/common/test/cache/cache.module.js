"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const cache_constants_1 = require("../../cache/cache.constants");
const cache_module_1 = require("../../cache/cache.module");
describe('CacheModule', () => {
    describe('register', () => {
        it('should provide an options', () => {
            const options = {
                test: 'test',
            };
            const dynamicModule = cache_module_1.CacheModule.register(options);
            chai_1.expect(dynamicModule.providers).to.have.length(1);
            chai_1.expect(dynamicModule.imports).to.be.empty;
            chai_1.expect(dynamicModule.exports).to.contain(cache_constants_1.CACHE_MODULE_OPTIONS);
            chai_1.expect(dynamicModule.providers).to.contain({
                provide: cache_constants_1.CACHE_MODULE_OPTIONS,
                useValue: options,
            });
        });
    });
    describe('register async', () => {
        describe('when useFactory', () => {
            it('should provide an options', () => {
                const options = {};
                const asyncOptions = {
                    useFactory: () => options,
                };
                const dynamicModule = cache_module_1.CacheModule.registerAsync(asyncOptions);
                chai_1.expect(dynamicModule.providers).to.have.length(1);
                chai_1.expect(dynamicModule.imports).to.be.empty;
                chai_1.expect(dynamicModule.exports).to.contain(cache_constants_1.CACHE_MODULE_OPTIONS);
                chai_1.expect(dynamicModule.providers).to.contain({
                    provide: cache_constants_1.CACHE_MODULE_OPTIONS,
                    useFactory: asyncOptions.useFactory,
                    inject: [],
                });
            });
        });
        describe('when useExisting', () => {
            it('should provide an options', () => {
                const asyncOptions = {
                    useExisting: Object,
                };
                const dynamicModule = cache_module_1.CacheModule.registerAsync(asyncOptions);
                chai_1.expect(dynamicModule.providers).to.have.length(1);
                chai_1.expect(dynamicModule.imports).to.be.empty;
                chai_1.expect(dynamicModule.exports).to.contain(cache_constants_1.CACHE_MODULE_OPTIONS);
            });
        });
        describe('when useClass', () => {
            it('should provide an options', () => {
                const asyncOptions = {
                    useClass: Object,
                };
                const dynamicModule = cache_module_1.CacheModule.registerAsync(asyncOptions);
                chai_1.expect(dynamicModule.providers).to.have.length(2);
                chai_1.expect(dynamicModule.imports).to.be.empty;
                chai_1.expect(dynamicModule.exports).to.contain(cache_constants_1.CACHE_MODULE_OPTIONS);
            });
        });
    });
});
