"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("@nestjs/common/constants");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const iterare_1 = require("iterare");
require("reflect-metadata");
const context_creator_1 = require("../helpers/context-creator");
class PipesContextCreator extends context_creator_1.ContextCreator {
    constructor(container, config) {
        super();
        this.container = container;
        this.config = config;
    }
    create(instance, callback, module) {
        this.moduleContext = module;
        return this.createContext(instance, callback, constants_1.PIPES_METADATA);
    }
    createConcreteContext(metadata) {
        if (shared_utils_1.isUndefined(metadata) || shared_utils_1.isEmpty(metadata)) {
            return [];
        }
        return iterare_1.default(metadata)
            .filter((pipe) => pipe && (pipe.name || pipe.transform))
            .map(pipe => this.getPipeInstance(pipe))
            .filter(pipe => pipe && pipe.transform && shared_utils_1.isFunction(pipe.transform))
            .map(pipe => pipe.transform.bind(pipe))
            .toArray();
    }
    getPipeInstance(pipe) {
        const isObject = pipe.transform;
        if (isObject) {
            return pipe;
        }
        const instanceWrapper = this.getInstanceByMetatype(pipe);
        return instanceWrapper && instanceWrapper.instance
            ? instanceWrapper.instance
            : null;
    }
    getInstanceByMetatype(metatype) {
        if (!this.moduleContext) {
            return undefined;
        }
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
        return this.config.getGlobalPipes();
    }
    setModuleContext(context) {
        this.moduleContext = context;
    }
}
exports.PipesContextCreator = PipesContextCreator;
