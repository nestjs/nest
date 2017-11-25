"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const iterare_1 = require("iterare");
const constants_1 = require("@nestjs/common/constants");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const context_creator_1 = require("./../helpers/context-creator");
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
        if (shared_utils_1.isUndefined(metadata) || shared_utils_1.isEmpty(metadata) || !this.moduleContext) {
            return [];
        }
        const isGlobalMetadata = metadata === this.getGlobalMetadata();
        return isGlobalMetadata ?
            this.createGlobalMetadataContext(metadata) :
            iterare_1.default(metadata).filter((metatype) => metatype && metatype.name)
                .map((metatype) => this.getInstanceByMetatype(metatype))
                .filter((wrapper) => wrapper && wrapper.instance)
                .map((wrapper) => wrapper.instance)
                .filter((guard) => guard && shared_utils_1.isFunction(guard.canActivate))
                .toArray();
    }
    createGlobalMetadataContext(metadata) {
        return iterare_1.default(metadata)
            .filter((guard) => guard && guard.canActivate && shared_utils_1.isFunction(guard.canActivate))
            .toArray();
    }
    getInstanceByMetatype(metatype) {
        const collection = this.container.getModules();
        const module = collection.get(this.moduleContext);
        if (!module) {
            return undefined;
        }
        return module.injectables.get(metatype.name);
    }
    getGlobalMetadata() {
        if (!this.config) {
            return [];
        }
        return this.config.getGlobalGuards();
    }
}
exports.GuardsContextCreator = GuardsContextCreator;
