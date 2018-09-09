"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const decorators_1 = require("../../decorators");
const cache_constants_1 = require("../cache.constants");
// NOTE (external)
// We need to deduplicate them here due to the circular dependency
// between core and common packages
const HTTP_SERVER_REF = 'HTTP_SERVER_REF';
const REFLECTOR = 'Reflector';
let CacheInterceptor = class CacheInterceptor {
    constructor(httpServer, cacheManager, reflector) {
        this.httpServer = httpServer;
        this.cacheManager = cacheManager;
        this.reflector = reflector;
        this.isHttpApp = httpServer && !!httpServer.getRequestMethod;
    }
    async intercept(context, call$) {
        const key = this.trackBy(context);
        if (!key) {
            return call$;
        }
        try {
            const value = await this.cacheManager.get(key);
            if (value) {
                return rxjs_1.of(value);
            }
            return call$.pipe(operators_1.tap(response => this.cacheManager.set(key, response)));
        }
        catch (_a) {
            return call$;
        }
    }
    trackBy(context) {
        if (!this.isHttpApp) {
            return this.reflector.get(cache_constants_1.CACHE_KEY_METADATA, context.getHandler());
        }
        const request = context.getArgByIndex(0);
        if (this.httpServer.getRequestMethod(request) !== 'GET') {
            return undefined;
        }
        return this.httpServer.getRequestUrl(request);
    }
};
CacheInterceptor = __decorate([
    decorators_1.Injectable(),
    __param(0, decorators_1.Optional()),
    __param(0, decorators_1.Inject(HTTP_SERVER_REF)),
    __param(1, decorators_1.Inject(cache_constants_1.CACHE_MANAGER)),
    __param(2, decorators_1.Inject(REFLECTOR)),
    __metadata("design:paramtypes", [Object, Object, Object])
], CacheInterceptor);
exports.CacheInterceptor = CacheInterceptor;
