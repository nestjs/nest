"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const iterare_1 = require("iterare");
const constants_1 = require("@nestjs/common/constants");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const context_creator_1 = require("./../helpers/context-creator");
class GuardsContextCreator extends context_creator_1.ContextCreator {
    constructor(container) {
        super();
        this.container = container;
    }
    create(instance, callback, module) {
        this.moduleContext = module;
        return this.createContext(instance, callback, constants_1.GUARDS_METADATA);
    }
    createConcreteContext(metadata) {
        if (shared_utils_1.isUndefined(metadata) || shared_utils_1.isEmpty(metadata) || !this.moduleContext) {
            return [];
        }
        return iterare_1.default(metadata).filter((metatype) => metatype && metatype.name)
            .map((metatype) => {
            const allModules = this.container.getModules();
            const module = allModules.get(this.moduleContext);
            if (!module) {
                return undefined;
            }
            return module.injectables.get(metatype.name);
        })
            .filter((wrapper) => wrapper && wrapper.instance)
            .map((wrapper) => wrapper.instance)
            .filter((guard) => guard && shared_utils_1.isFunction(guard.canActivate))
            .toArray();
    }
    getGlobalMetadata() {
        return [];
    }
}
exports.GuardsContextCreator = GuardsContextCreator;
//# sourceMappingURL=guards-context-creator.js.map