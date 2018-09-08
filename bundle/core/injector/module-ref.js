"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const unknown_element_exception_1 = require("../errors/exceptions/unknown-element.exception");
class ModuleRef {
    constructor(container) {
        this.container = container;
    }
    find(typeOrToken) {
        this.initFlattenModule();
        return this.findInstanceByPrototypeOrToken(typeOrToken, this.flattenModuleFixture);
    }
    findInstanceByPrototypeOrToken(metatypeOrToken, contextModule) {
        const dependencies = new Map([
            ...contextModule.components,
            ...contextModule.routes,
            ...contextModule.injectables,
        ]);
        const name = shared_utils_1.isFunction(metatypeOrToken)
            ? metatypeOrToken.name
            : metatypeOrToken;
        const instanceWrapper = dependencies.get(name);
        if (!instanceWrapper) {
            throw new unknown_element_exception_1.UnknownElementException();
        }
        return instanceWrapper.instance;
    }
    initFlattenModule() {
        if (this.flattenModuleFixture) {
            return void 0;
        }
        const modules = this.container.getModules();
        const initialValue = {
            components: [],
            routes: [],
            injectables: [],
        };
        this.flattenModuleFixture = [...modules.values()].reduce((flatten, curr) => ({
            components: [...flatten.components, ...curr.components],
            routes: [...flatten.routes, ...curr.routes],
            injectables: [...flatten.injectables, ...curr.injectables],
        }), initialValue);
    }
}
exports.ModuleRef = ModuleRef;
