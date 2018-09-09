"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const constants_1 = require("@nestjs/common/constants");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
require("reflect-metadata");
const constants_2 = require("../guards/constants");
const context_utils_1 = require("./context-utils");
class ExternalContextCreator {
    constructor(guardsContextCreator, guardsConsumer, interceptorsContextCreator, interceptorsConsumer, modulesContainer, pipesContextCreator, pipesConsumer) {
        this.guardsContextCreator = guardsContextCreator;
        this.guardsConsumer = guardsConsumer;
        this.interceptorsContextCreator = interceptorsContextCreator;
        this.interceptorsConsumer = interceptorsConsumer;
        this.modulesContainer = modulesContainer;
        this.pipesContextCreator = pipesContextCreator;
        this.pipesConsumer = pipesConsumer;
        this.contextUtils = new context_utils_1.ContextUtils();
    }
    create(instance, callback, methodName, metadataKey, paramsFactory) {
        const module = this.findContextModuleName(instance.constructor);
        const pipes = this.pipesContextCreator.create(instance, callback, module);
        const paramtypes = this.contextUtils.reflectCallbackParamtypes(instance, methodName);
        const guards = this.guardsContextCreator.create(instance, callback, module);
        const interceptors = this.interceptorsContextCreator.create(instance, callback, module);
        const metadata = this.contextUtils.reflectCallbackMetadata(instance, methodName, metadataKey || '') || {};
        const keys = Object.keys(metadata);
        const argsLength = this.contextUtils.getArgumentsLength(keys, metadata);
        const paramsMetadata = paramsFactory
            ? this.exchangeKeysForValues(keys, metadata, module, paramsFactory)
            : null;
        const paramsOptions = paramsMetadata
            ? this.contextUtils.mergeParamsMetatypes(paramsMetadata, paramtypes)
            : [];
        const fnApplyPipes = this.createPipesFn(pipes, paramsOptions);
        const handler = (initialArgs, ...args) => async () => {
            if (fnApplyPipes) {
                await fnApplyPipes(initialArgs, ...args);
                return callback.apply(instance, initialArgs);
            }
            return callback.apply(instance, args);
        };
        return async (...args) => {
            const initialArgs = this.contextUtils.createNullArray(argsLength);
            const canActivate = await this.guardsConsumer.tryActivate(guards, args, instance, callback);
            if (!canActivate) {
                throw new common_1.ForbiddenException(constants_2.FORBIDDEN_MESSAGE);
            }
            const result = await this.interceptorsConsumer.intercept(interceptors, args, instance, callback, handler(initialArgs, ...args));
            return await this.transformToResult(result);
        };
    }
    findContextModuleName(constructor) {
        const className = constructor.name;
        if (!className) {
            return '';
        }
        for (const [key, module] of [...this.modulesContainer.entries()]) {
            if (this.findComponentByClassName(module, className)) {
                return key;
            }
        }
        return '';
    }
    findComponentByClassName(module, className) {
        const { components } = module;
        const hasComponent = [...components.keys()].some(component => component === className);
        return hasComponent;
    }
    exchangeKeysForValues(keys, metadata, moduleContext, paramsFactory) {
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
            const extractValue = (...args) => paramsFactory.exchangeKeyForValue(numericType, data, args);
            return { index, extractValue, type: numericType, data, pipes };
        });
    }
    getCustomFactory(factory, data) {
        return !shared_utils_1.isUndefined(factory) && shared_utils_1.isFunction(factory)
            ? (...args) => factory(data, args)
            : () => null;
    }
    createPipesFn(pipes, paramsOptions) {
        const pipesFn = async (args, ...gqlArgs) => {
            await Promise.all(paramsOptions.map(async (param) => {
                const { index, extractValue, type, data, metatype, pipes: paramPipes, } = param;
                const value = extractValue(...gqlArgs);
                args[index] = await this.getParamValue(value, { metatype, type, data }, pipes.concat(paramPipes));
            }));
        };
        return paramsOptions.length ? pipesFn : null;
    }
    async getParamValue(value, { metatype, type, data }, transforms) {
        return await this.pipesConsumer.apply(value, { metatype, type, data }, transforms);
    }
    async transformToResult(resultOrDeffered) {
        if (resultOrDeffered && shared_utils_1.isFunction(resultOrDeffered.subscribe)) {
            return await resultOrDeffered.toPromise();
        }
        return resultOrDeffered;
    }
}
exports.ExternalContextCreator = ExternalContextCreator;
