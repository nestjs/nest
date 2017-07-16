"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const iterare_1 = require("iterare");
const constants_1 = require("@nestjs/common/constants");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const context_creator_1 = require("./../helpers/context-creator");
class PipesContextCreator extends context_creator_1.ContextCreator {
    constructor(config) {
        super();
        this.config = config;
    }
    create(instance, callback) {
        return this.createContext(instance, callback, constants_1.PIPES_METADATA);
    }
    createConcreteContext(metadata) {
        if (shared_utils_1.isUndefined(metadata) || shared_utils_1.isEmpty(metadata)) {
            return [];
        }
        return iterare_1.default(metadata).filter((pipe) => pipe && pipe.transform && shared_utils_1.isFunction(pipe.transform))
            .map((pipe) => pipe.transform.bind(pipe))
            .toArray();
    }
    getGlobalMetadata() {
        return this.config.getGlobalPipes();
    }
}
exports.PipesContextCreator = PipesContextCreator;
//# sourceMappingURL=pipes-context-creator.js.map