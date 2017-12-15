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
        return (...args) => __awaiter(this, void 0, void 0, function* () {
            const [req] = args;
            const canActivate = yield this.guardsConsumer.tryActivate(guards, req, instance, callback);
            if (!canActivate) {
                throw new common_1.HttpException(constants_1.FORBIDDEN_MESSAGE, common_1.HttpStatus.FORBIDDEN);
            }
            const handler = () => callback.apply(instance, args);
            return yield this.interceptorsConsumer.intercept(interceptors, req, instance, callback, handler);
        });
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
