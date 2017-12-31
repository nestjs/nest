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
const common_1 = require("@nestjs/common");
const constants_2 = require("../guards/constants");
const router_response_controller_1 = require("./router-response-controller");
class RouterExecutionContext {
    constructor(paramsFactory, pipesContextCreator, pipesConsumer, guardsContextCreator, guardsConsumer, interceptorsContextCreator, interceptorsConsumer) {
        this.paramsFactory = paramsFactory;
        this.pipesContextCreator = pipesContextCreator;
        this.pipesConsumer = pipesConsumer;
        this.guardsContextCreator = guardsContextCreator;
        this.guardsConsumer = guardsConsumer;
        this.interceptorsContextCreator = interceptorsContextCreator;
        this.interceptorsConsumer = interceptorsConsumer;
        this.responseController = new router_response_controller_1.RouterResponseController();
    }
    create(instance, callback, methodName, module, requestMethod) {
        const metadata = this.reflectCallbackMetadata(instance, methodName) || {};
        const keys = Object.keys(metadata);
        const argsLength = this.getArgumentsLength(keys, metadata);
        const pipes = this.pipesContextCreator.create(instance, callback);
        const paramtypes = this.reflectCallbackParamtypes(instance, methodName);
        const guards = this.guardsContextCreator.create(instance, callback, module);
        const interceptors = this.interceptorsContextCreator.create(instance, callback, module);
        const httpCode = this.reflectHttpStatusCode(callback);
        const paramsMetadata = this.exchangeKeysForValues(keys, metadata);
        const isResponseHandled = paramsMetadata.some(({ type }) => type === route_paramtypes_enum_1.RouteParamtypes.RESPONSE || type === route_paramtypes_enum_1.RouteParamtypes.NEXT);
        const paramsOptions = this.mergeParamsMetatypes(paramsMetadata, paramtypes);
        const httpStatusCode = httpCode
            ? httpCode
            : this.responseController.getStatusByMethod(requestMethod);
        const fnCanActivate = this.createGuardsFn(guards, instance, callback);
        const fnApplyPipes = this.createPipesFn(pipes, paramsOptions);
        const fnHandleResponse = this.createHandleResponseFn(isResponseHandled, httpStatusCode);
        return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const args = this.createNullArray(argsLength);
            yield fnCanActivate(req);
            yield fnApplyPipes(args, req, res, next);
            const handler = () => callback.apply(instance, args);
            const result = yield this.interceptorsConsumer.intercept(interceptors, req, instance, callback, handler);
            fnHandleResponse(result, res);
        });
    }
    mapParamType(key) {
        const keyPair = key.split(':');
        return keyPair[0];
    }
    reflectCallbackMetadata(instance, methodName) {
        return Reflect.getMetadata(constants_1.ROUTE_ARGS_METADATA, instance, methodName);
    }
    reflectCallbackParamtypes(instance, methodName) {
        return Reflect.getMetadata(constants_1.PARAMTYPES_METADATA, instance, methodName);
    }
    reflectHttpStatusCode(callback) {
        return Reflect.getMetadata(constants_1.HTTP_CODE_METADATA, callback);
    }
    getArgumentsLength(keys, metadata) {
        return Math.max(...keys.map(key => metadata[key].index)) + 1;
    }
    createNullArray(length) {
        return Array.apply(null, { length }).fill(null);
    }
    exchangeKeysForValues(keys, metadata) {
        return keys.map(key => {
            const { index, data, pipes } = metadata[key];
            const type = this.mapParamType(key);
            if (key.includes(constants_1.CUSTOM_ROUTE_AGRS_METADATA)) {
                const { factory } = metadata[key];
                const customExtractValue = this.getCustomFactory(factory, data);
                return { index, extractValue: customExtractValue, type, data, pipes };
            }
            const nType = Number(type);
            const extractValue = (req, res, next) => this.paramsFactory.exchangeKeyForValue(nType, data, { req, res, next });
            return { index, extractValue, type: nType, data, pipes };
        });
    }
    getCustomFactory(factory, data) {
        return !shared_utils_1.isUndefined(factory) && shared_utils_1.isFunction(factory)
            ? (req, res, next) => factory(data, req)
            : () => null;
    }
    mergeParamsMetatypes(paramsProperties, paramtypes) {
        if (!paramtypes) {
            return paramsProperties;
        }
        return paramsProperties.map(param => (Object.assign({}, param, { metatype: paramtypes[param.index] })));
    }
    getParamValue(value, { metatype, type, data }, transforms) {
        return __awaiter(this, void 0, void 0, function* () {
            if (type === route_paramtypes_enum_1.RouteParamtypes.BODY ||
                type === route_paramtypes_enum_1.RouteParamtypes.QUERY ||
                type === route_paramtypes_enum_1.RouteParamtypes.PARAM ||
                shared_utils_1.isString(type)) {
                return yield this.pipesConsumer.apply(value, { metatype, type, data }, transforms);
            }
            return Promise.resolve(value);
        });
    }
    createGuardsFn(guards, instance, callback) {
        const canActivateFn = (req) => __awaiter(this, void 0, void 0, function* () {
            const canActivate = yield this.guardsConsumer.tryActivate(guards, req, instance, callback);
            if (!canActivate) {
                throw new common_1.HttpException(constants_2.FORBIDDEN_MESSAGE, common_1.HttpStatus.FORBIDDEN);
            }
        });
        return guards.length ? canActivateFn : (req) => __awaiter(this, void 0, void 0, function* () { return undefined; });
    }
    createPipesFn(pipes, paramsOptions) {
        const pipesFn = (args, req, res, next) => __awaiter(this, void 0, void 0, function* () {
            yield Promise.all(paramsOptions.map((param) => __awaiter(this, void 0, void 0, function* () {
                const { index, extractValue, type, data, metatype, pipes: paramPipes, } = param;
                const value = extractValue(req, res, next);
                args[index] = yield this.getParamValue(value, { metatype, type, data }, pipes.concat(this.pipesContextCreator.createConcreteContext(paramPipes)));
            })));
        });
        return paramsOptions.length ? pipesFn : (...args) => __awaiter(this, void 0, void 0, function* () { return undefined; });
    }
    createHandleResponseFn(isResponseHandled, httpStatusCode) {
        return !isResponseHandled
            ? (result, res) => this.responseController.apply(result, res, httpStatusCode)
            : (...args) => undefined;
    }
}
exports.RouterExecutionContext = RouterExecutionContext;
