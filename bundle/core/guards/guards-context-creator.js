"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("@nestjs/common/constants");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const iterare_1 = require("iterare");
require("reflect-metadata");
const context_creator_1 = require("../helpers/context-creator");
class GuardsContextCreator extends context_creator_1.ContextCreator {
    constructor(container, config) {
        super();
        this.container = container;
        this.config = config;
    }
    create(instance, callback, module) {
        this.moduleContext = module;
        return this.createContext(instance, callback, constants_1.GUARDS_METADATA);
    }
    createConcreteContext(metadata) {
        if (shared_utils_1.isUndefined(metadata) || shared_utils_1.isEmpty(metadata)) {
            return [];
        }
        return iterare_1.default(metadata)
            .filter((guard) => guard && (guard.name || guard.canActivate))
            .map(guard => this.getGuardInstance(guard))
            .filter((guard) => guard && shared_utils_1.isFunction(guard.canActivate))
            .toArray();
    }
    getGuardInstance(guard) {
        const isObject = guard.canActivate;
        if (isObject) {
            return guard;
        }
        const instanceWrapper = this.getInstanceByMetatype(guard);
        return instanceWrapper && instanceWrapper.instance
            ? instanceWrapper.instance
            : null;
    }
    getInstanceByMetatype(guard) {
        if (!this.moduleContext) {
            return undefined;
        }
        const collection = this.container.getModules();
        const module = collection.get(this.moduleContext);
        if (!module) {
            return undefined;
        }
        return module.injectables.get(guard.name);
    }
    getGlobalMetadata() {
        if (!this.config) {
            return [];
        }
        return this.config.getGlobalGuards();
    }
}
exports.GuardsContextCreator = GuardsContextCreator;
