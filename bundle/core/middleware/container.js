"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MiddlewareContainer {
    constructor() {
        this.middleware = new Map();
        this.configurationSets = new Map();
    }
    getMiddleware(module) {
        return this.middleware.get(module) || new Map();
    }
    getConfigs() {
        return this.configurationSets;
    }
    addConfig(configList, module) {
        const middleware = this.getCurrentMiddleware(module);
        const currentConfig = this.getCurrentConfig(module);
        const configurations = configList || [];
        configurations.forEach(config => {
            [].concat(config.middleware).map(metatype => {
                const token = metatype.name;
                middleware.set(token, {
                    instance: null,
                    metatype,
                });
            });
            currentConfig.add(config);
        });
    }
    getCurrentMiddleware(module) {
        if (!this.middleware.has(module)) {
            this.middleware.set(module, new Map());
        }
        return this.middleware.get(module);
    }
    getCurrentConfig(module) {
        if (!this.configurationSets.has(module)) {
            this.configurationSets.set(module, new Set());
        }
        return this.configurationSets.get(module);
    }
}
exports.MiddlewareContainer = MiddlewareContainer;
