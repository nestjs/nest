"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MiddlewaresContainer {
    constructor() {
        this.middlewares = new Map();
        this.configs = new Map();
    }
    getMiddlewares(module) {
        return this.middlewares.get(module) || new Map();
    }
    getConfigs() {
        return this.configs;
    }
    addConfig(configList, module) {
        const middlewares = this.getCurrentMiddlewares(module);
        const currentConfig = this.getCurrentConfig(module);
        const configurations = configList || [];
        configurations.map((config) => {
            [].concat(config.middlewares).map((metatype) => {
                const token = metatype.name;
                middlewares.set(token, {
                    instance: null,
                    metatype,
                });
            });
            currentConfig.add(config);
        });
    }
    getCurrentMiddlewares(module) {
        if (!this.middlewares.has(module)) {
            this.middlewares.set(module, new Map());
        }
        return this.middlewares.get(module);
    }
    getCurrentConfig(module) {
        if (!this.configs.has(module)) {
            this.configs.set(module, new Set());
        }
        return this.configs.get(module);
    }
}
exports.MiddlewaresContainer = MiddlewaresContainer;
