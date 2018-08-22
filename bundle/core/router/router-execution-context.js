"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const constants_1 = require("@nestjs/common/constants");
const route_paramtypes_enum_1 = require("@nestjs/common/enums/route-paramtypes.enum");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
require("reflect-metadata");
const constants_2 = require("../guards/constants");
const context_utils_1 = require("../helpers/context-utils");
const router_response_controller_1 = require("./router-response-controller");
class RouterExecutionContext {
    constructor(paramsFactory, pipesContextCreator, pipesConsumer, guardsContextCreator, guardsConsumer, interceptorsContextCreator, interceptorsConsumer, applicationRef) {
        this.paramsFactory = paramsFactory;
        this.pipesContextCreator = pipesContextCreator;
        this.pipesConsumer = pipesConsumer;
        this.guardsContextCreator = guardsContextCreator;
        this.guardsConsumer = guardsConsumer;
        this.interceptorsContextCreator = interceptorsContextCreator;
        this.interceptorsConsumer = interceptorsConsumer;
        this.applicationRef = applicationRef;
        this.contextUtils = new context_utils_1.ContextUtils();
        this.responseController = new router_response_controller_1.RouterResponseController(applicationRef);
    }
    create(instance, callback, methodName, module, requestMethod) {
        const metadata = this.contextUtils.reflectCallbackMetadata(instance, methodName, constants_1.ROUTE_ARGS_METADATA) || {};
        const keys = Object.keys(metadata);
        const argsLength = this.contextUtils.getArgumentsLength(keys, metadata);
        const pipes = this.pipesContextCreator.create(instance, callback, module);
        const paramtypes = this.contextUtils.reflectCallbackParamtypes(instance, methodName);
        const guards = this.guardsContextCreator.create(instance, callback, module);
        const interceptors = this.interceptorsContextCreator.create(instance, callback, module);
        const httpCode = this.reflectHttpStatusCode(callback);
        const paramsMetadata = this.exchangeKeysForValues(keys, metadata, module);
        const isResponseHandled = paramsMetadata.some(({ type }) => type === route_paramtypes_enum_1.RouteParamtypes.RESPONSE || type === route_paramtypes_enum_1.RouteParamtypes.NEXT);
        const paramsOptions = this.contextUtils.mergeParamsMetatypes(paramsMetadata, paramtypes);
        const httpStatusCode = httpCode
            ? httpCode
            : this.responseController.getStatusByMethod(requestMethod);
        const fnCanActivate = this.createGuardsFn(guards, instance, callback);
        const fnApplyPipes = this.createPipesFn(pipes, paramsOptions);
        const fnHandleResponse = this.createHandleResponseFn(callback, isResponseHandled, httpStatusCode);
        const handler = (args, req, res, next) => async () => {
            fnApplyPipes && (await fnApplyPipes(args, req, res, next));
            return callback.apply(instance, args);
        };
        return async (req, res, next) => {
            const args = this.contextUtils.createNullArray(argsLength);
            fnCanActivate && (await fnCanActivate([req, res]));
            const result = await this.interceptorsConsumer.intercept(interceptors, [req, res], instance, callback, handler(args, req, res, next));
            await fnHandleResponse(result, res);
        };
    }
    reflectHttpStatusCode(callback) {
        return Reflect.getMetadata(constants_1.HTTP_CODE_METADATA, callback);
    }
    reflectRenderTemplate(callback) {
        return Reflect.getMetadata(constants_1.RENDER_METADATA, callback);
    }
    reflectResponseHeaders(callback) {
        return Reflect.getMetadata(constants_1.HEADERS_METADATA, callback) || [];
    }
    exchangeKeysForValues(keys, metadata, moduleContext) {
        this.pipesContextCreator.setModuleContext(moduleContext);
        return keys.map(key => {
            const { index, data, pipes: pipesCollection } = metadata[key];
            const pipes = this.pipesContextCreator.createConcreteContext(pipesCollection);
            const type = this.contextUtils.mapParamType(key);
            if (key.includes(constants_1.CUSTOM_ROUTE_AGRS_METADATA)) {
                const { factory } = metadata[key];
                const customExtractValue = this.getCustomFactory(factory, data);
                return { index, extractValue: customExtractValue, type, data, pipes };
            }
            const numericType = Number(type);
            const extractValue = (req, res, next) => this.paramsFactory.exchangeKeyForValue(numericType, data, {
                req,
                res,
                next,
            });
            return { index, extractValue, type: numericType, data, pipes };
        });
    }
    getCustomFactory(factory, data) {
        return !shared_utils_1.isUndefined(factory) && shared_utils_1.isFunction(factory)
            ? (req, res, next) => factory(data, req)
            : () => null;
    }
    async getParamValue(value, { metatype, type, data }, transforms) {
        if (type === route_paramtypes_enum_1.RouteParamtypes.BODY ||
            type === route_paramtypes_enum_1.RouteParamtypes.QUERY ||
            type === route_paramtypes_enum_1.RouteParamtypes.PARAM ||
            shared_utils_1.isString(type)) {
            return await this.pipesConsumer.apply(value, { metatype, type, data }, transforms);
        }
        return Promise.resolve(value);
    }
    createGuardsFn(guards, instance, callback) {
        const canActivateFn = async (args) => {
            const canActivate = await this.guardsConsumer.tryActivate(guards, args, instance, callback);
            if (!canActivate) {
                throw new common_1.ForbiddenException(constants_2.FORBIDDEN_MESSAGE);
            }
        };
        return guards.length ? canActivateFn : null;
    }
    createPipesFn(pipes, paramsOptions) {
        const pipesFn = async (args, req, res, next) => {
            await Promise.all(paramsOptions.map(async (param) => {
                const { index, extractValue, type, data, metatype, pipes: paramPipes, } = param;
                const value = extractValue(req, res, next);
                args[index] = await this.getParamValue(value, { metatype, type, data }, pipes.concat(paramPipes));
            }));
        };
        return paramsOptions.length ? pipesFn : null;
    }
    createHandleResponseFn(callback, isResponseHandled, httpStatusCode) {
        const renderTemplate = this.reflectRenderTemplate(callback);
        const responseHeaders = this.reflectResponseHeaders(callback);
        if (renderTemplate) {
            return async (result, res) => {
                this.responseController.setHeaders(res, responseHeaders);
                await this.responseController.render(result, res, renderTemplate);
            };
        }
        return async (result, res) => {
            this.responseController.setHeaders(res, responseHeaders);
            !isResponseHandled &&
                (await this.responseController.apply(result, res, httpStatusCode));
        };
    }
}
exports.RouterExecutionContext = RouterExecutionContext;
