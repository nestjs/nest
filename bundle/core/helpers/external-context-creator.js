"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../guards/constants");
const common_1 = require("@nestjs/common");
class ExternalContextCreator {
    constructor(guardsContextCreator, guardsConsumer, interceptorsContextCreator, interceptorsConsumer, modulesContainer) {
        this.guardsContextCreator = guardsContextCreator;
        this.guardsConsumer = guardsConsumer;
        this.interceptorsContextCreator = interceptorsContextCreator;
        this.interceptorsConsumer = interceptorsConsumer;
        this.modulesContainer = modulesContainer;
    }
    create(instance, callback, methodName) {
        const module = this.findContextModuleName(instance.constructor);
        const guards = this.guardsContextCreator.create(instance, callback, module);
        const interceptors = this.interceptorsContextCreator.create(instance, callback, module);
        return async (...args) => {
            const canActivate = await this.guardsConsumer.tryActivate(guards, args, instance, callback);
            if (!canActivate) {
                throw new common_1.ForbiddenException(constants_1.FORBIDDEN_MESSAGE);
            }
            const handler = () => callback.apply(instance, args);
            return await this.interceptorsConsumer.intercept(interceptors, args, instance, callback, handler);
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
        const hasComponent = [...components.keys()].find(component => component === className);
        return !!hasComponent;
    }
}
exports.ExternalContextCreator = ExternalContextCreator;
