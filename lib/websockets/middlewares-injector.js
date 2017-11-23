"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const iterare_1 = require("iterare");
const constants_1 = require("./constants");
const unknown_module_exception_1 = require("@nestjs/core/errors/exceptions/unknown-module.exception");
const runtime_exception_1 = require("@nestjs/core/errors/exceptions/runtime.exception");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
class MiddlewaresInjector {
    constructor(container, config) {
        this.container = container;
        this.config = config;
    }
    inject(server, instance, module) {
        const adapter = this.config.getIoAdapter();
        if (!adapter.bindMiddleware) {
            return;
        }
        const opaqueTokens = this.reflectMiddlewaresTokens(instance);
        const modules = this.container.getModules();
        if (!modules.has(module)) {
            throw new unknown_module_exception_1.UnknownModuleException();
        }
        const { components } = modules.get(module);
        this.applyMiddlewares(server, components, opaqueTokens);
    }
    reflectMiddlewaresTokens(instance) {
        const prototype = Object.getPrototypeOf(instance);
        return Reflect.getMetadata(constants_1.GATEWAY_MIDDLEWARES, prototype.constructor) || [];
    }
    applyMiddlewares(server, components, tokens) {
        const adapter = this.config.getIoAdapter();
        iterare_1.default(tokens).map(token => this.bindMiddleware(token.name, components))
            .filter(middleware => !shared_utils_1.isNil(middleware))
            .forEach(middleware => adapter.bindMiddleware(server, middleware));
    }
    bindMiddleware(token, components) {
        if (!components.has(token)) {
            throw new runtime_exception_1.RuntimeException();
        }
        const { instance } = components.get(token);
        if (!this.isGatewayMiddleware(instance))
            return null;
        const middleware = instance.resolve();
        return shared_utils_1.isFunction(middleware) ? middleware.bind(instance) : null;
    }
    isGatewayMiddleware(middleware) {
        return !shared_utils_1.isUndefined(middleware.resolve);
    }
}
exports.MiddlewaresInjector = MiddlewaresInjector;
