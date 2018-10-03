"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const decorators_1 = require("../decorators");
const cache_constants_1 = require("./cache.constants");
const cache_providers_1 = require("./cache.providers");
let CacheModule = CacheModule_1 = class CacheModule {
    static register(options = {}) {
        return {
            module: CacheModule_1,
            providers: [{ provide: cache_constants_1.CACHE_MODULE_OPTIONS, useValue: options }],
        };
    }
    static registerAsync(options) {
        return {
            module: CacheModule_1,
            imports: options.imports,
            providers: this.createAsyncProviders(options),
        };
    }
    static createAsyncProviders(options) {
        if (options.useExisting || options.useFactory) {
            return [this.createAsyncOptionsProvider(options)];
        }
        return [
            this.createAsyncOptionsProvider(options),
            {
                provide: options.useClass,
                useClass: options.useClass,
            },
        ];
    }
    static createAsyncOptionsProvider(options) {
        if (options.useFactory) {
            return {
                provide: cache_constants_1.CACHE_MODULE_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || [],
            };
        }
        return {
            provide: cache_constants_1.CACHE_MODULE_OPTIONS,
            useFactory: async (optionsFactory) => optionsFactory.createCacheOptions(),
            inject: [options.useExisting || options.useClass],
        };
    }
};
CacheModule = CacheModule_1 = __decorate([
    decorators_1.Module({
        providers: [cache_providers_1.createCacheManager()],
        exports: [cache_constants_1.CACHE_MANAGER],
    })
], CacheModule);
exports.CacheModule = CacheModule;
var CacheModule_1;
