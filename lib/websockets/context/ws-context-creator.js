"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("@nestjs/common/constants");
const constants_2 = require("@nestjs/core/guards/constants");
const ws_exception_1 = require("../exceptions/ws-exception");
class WsContextCreator {
    constructor(wsProxy, exceptionFiltersContext, pipesCreator, pipesConsumer, guardsContextCreator, guardsConsumer, interceptorsContextCreator, interceptorsConsumer) {
        this.wsProxy = wsProxy;
        this.exceptionFiltersContext = exceptionFiltersContext;
        this.pipesCreator = pipesCreator;
        this.pipesConsumer = pipesConsumer;
        this.guardsContextCreator = guardsContextCreator;
        this.guardsConsumer = guardsConsumer;
        this.interceptorsContextCreator = interceptorsContextCreator;
        this.interceptorsConsumer = interceptorsConsumer;
    }
    create(instance, callback, module) {
        const exceptionHandler = this.exceptionFiltersContext.create(instance, callback);
        const pipes = this.pipesCreator.create(instance, callback);
        const guards = this.guardsContextCreator.create(instance, callback, module);
        const metatype = this.getDataMetatype(instance, callback);
        const interceptors = this.interceptorsContextCreator.create(instance, callback, module);
        return this.wsProxy.create((client, data) => __awaiter(this, void 0, void 0, function* () {
            const canActivate = yield this.guardsConsumer.tryActivate(guards, data, instance, callback);
            if (!canActivate) {
                throw new ws_exception_1.WsException(constants_2.FORBIDDEN_MESSAGE);
            }
            const result = yield this.pipesConsumer.applyPipes(data, { metatype }, pipes);
            const handler = () => callback.call(instance, client, data);
            return yield this.interceptorsConsumer.intercept(interceptors, result, instance, callback, handler);
        }), exceptionHandler);
    }
    reflectCallbackParamtypes(instance, callback) {
        return Reflect.getMetadata(constants_1.PARAMTYPES_METADATA, instance, callback.name);
    }
    getDataMetatype(instance, callback) {
        const paramtypes = this.reflectCallbackParamtypes(instance, callback);
        return paramtypes && paramtypes.length ? paramtypes[1] : null;
    }
}
exports.WsContextCreator = WsContextCreator;
