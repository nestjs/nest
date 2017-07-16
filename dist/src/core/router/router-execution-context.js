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
require("reflect-metadata");
const constants_1 = require("@nestjs/common/constants");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const route_paramtypes_enum_1 = require("@nestjs/common/enums/route-paramtypes.enum");
class RouterExecutionContext {
    constructor(paramsFactory, pipesContextCreator, pipesConsumer, guardsContextCreator, guardsConsumer) {
        this.paramsFactory = paramsFactory;
        this.pipesContextCreator = pipesContextCreator;
        this.pipesConsumer = pipesConsumer;
        this.guardsContextCreator = guardsContextCreator;
        this.guardsConsumer = guardsConsumer;
    }
    create(instance, callback, module) {
        const metadata = this.reflectCallbackMetadata(instance, callback);
        if (shared_utils_1.isUndefined(metadata)) {
            return callback.bind(instance);
        }
        const keys = Object.keys(metadata);
        const argsLength = this.getArgumentsLength(keys, metadata);
        const args = this.createNullArray(argsLength);
        const pipes = this.pipesContextCreator.create(instance, callback);
        const paramtypes = this.reflectCallbackParamtypes(instance, callback);
        const guards = this.guardsContextCreator.create(instance, callback, module);
        return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const paramProperties = this.exchangeKeysForValues(keys, metadata, { req, res, next });
            yield this.guardsConsumer.tryActivate(guards, req, instance, callback);
            for (const param of paramProperties) {
                const { index, value, type, data, pipes: paramPipes } = param;
                args[index] = yield this.getParamValue(value, { metatype: paramtypes[index], type, data }, pipes.concat(this.pipesContextCreator.createConcreteContext(paramPipes)));
            }
            return callback.apply(instance, args);
        });
    }
    mapParamType(key) {
        const keyPair = key.split(':');
        return Number(keyPair[0]);
    }
    reflectCallbackMetadata(instance, callback) {
        return Reflect.getMetadata(constants_1.ROUTE_ARGS_METADATA, instance, callback.name);
    }
    reflectCallbackParamtypes(instance, callback) {
        return Reflect.getMetadata(constants_1.PARAMTYPES_METADATA, instance, callback.name);
    }
    getArgumentsLength(keys, metadata) {
        return Math.max(...keys.map(key => metadata[key].index)) + 1;
    }
    createNullArray(length) {
        return Array.apply(null, { length }).fill(null);
    }
    exchangeKeysForValues(keys, metadata, { req, res, next }) {
        return keys.map(key => {
            const type = this.mapParamType(key);
            const paramMetadata = metadata[key];
            const { index, data, pipes } = paramMetadata;
            return {
                index,
                value: this.paramsFactory.exchangeKeyForValue(type, data, { req, res, next }),
                type, data, pipes,
            };
        });
    }
    getParamValue(value, { metatype, type, data }, transforms) {
        return __awaiter(this, void 0, void 0, function* () {
            if (type === route_paramtypes_enum_1.RouteParamtypes.BODY
                || type === route_paramtypes_enum_1.RouteParamtypes.QUERY
                || type === route_paramtypes_enum_1.RouteParamtypes.PARAM) {
                return yield this.pipesConsumer.apply(value, { metatype, type, data }, transforms);
            }
            return Promise.resolve(value);
        });
    }
}
exports.RouterExecutionContext = RouterExecutionContext;
//# sourceMappingURL=router-execution-context.js.map