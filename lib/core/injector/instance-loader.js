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
const injector_1 = require("./injector");
const common_1 = require("@nestjs/common");
const messages_1 = require("../helpers/messages");
class InstanceLoader {
    constructor(container) {
        this.container = container;
        this.injector = new injector_1.Injector();
        this.logger = new common_1.Logger(InstanceLoader.name, true);
    }
    createInstancesOfDependencies() {
        return __awaiter(this, void 0, void 0, function* () {
            const modules = this.container.getModules();
            this.createPrototypes(modules);
            yield this.createInstances(modules);
        });
    }
    createPrototypes(modules) {
        modules.forEach(module => {
            this.createPrototypesOfComponents(module);
            this.createPrototypesOfInjectables(module);
            this.createPrototypesOfRoutes(module);
        });
    }
    createInstances(modules) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const module of [...modules.values()]) {
                yield this.createInstancesOfComponents(module);
                yield this.createInstancesOfInjectables(module);
                yield this.createInstancesOfRoutes(module);
                const { name } = module.metatype;
                this.logger.log(messages_1.moduleInitMessage(name));
            }
        });
    }
    createPrototypesOfComponents(module) {
        module.components.forEach(wrapper => {
            this.injector.loadPrototypeOfInstance(wrapper, module.components);
        });
    }
    createInstancesOfComponents(module) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const [key, wrapper] of module.components) {
                yield this.injector.loadInstanceOfComponent(wrapper, module);
            }
        });
    }
    createPrototypesOfRoutes(module) {
        module.routes.forEach(wrapper => {
            this.injector.loadPrototypeOfInstance(wrapper, module.routes);
        });
    }
    createInstancesOfRoutes(module) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([...module.routes.values()].map((wrapper) => __awaiter(this, void 0, void 0, function* () { return yield this.injector.loadInstanceOfRoute(wrapper, module); })));
        });
    }
    createPrototypesOfInjectables(module) {
        module.injectables.forEach(wrapper => {
            this.injector.loadPrototypeOfInstance(wrapper, module.injectables);
        });
    }
    createInstancesOfInjectables(module) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([...module.injectables.values()].map((wrapper) => __awaiter(this, void 0, void 0, function* () { return yield this.injector.loadInstanceOfInjectable(wrapper, module); })));
        });
    }
}
exports.InstanceLoader = InstanceLoader;
