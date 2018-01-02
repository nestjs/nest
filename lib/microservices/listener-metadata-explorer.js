"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const constants_1 = require("./constants");
class ListenerMetadataExplorer {
    constructor(metadataScanner) {
        this.metadataScanner = metadataScanner;
    }
    explore(instance) {
        const instancePrototype = Object.getPrototypeOf(instance);
        return this.metadataScanner.scanFromPrototype(instance, instancePrototype, method => this.exploreMethodMetadata(instance, instancePrototype, method));
    }
    exploreMethodMetadata(instance, instancePrototype, methodName) {
        const targetCallback = instancePrototype[methodName];
        const isPattern = Reflect.getMetadata(constants_1.PATTERN_HANDLER_METADATA, targetCallback);
        if (shared_utils_1.isUndefined(isPattern)) {
            return null;
        }
        const pattern = Reflect.getMetadata(constants_1.PATTERN_METADATA, targetCallback);
        return {
            targetCallback,
            pattern,
        };
    }
    *scanForClientHooks(instance) {
        for (const propertyKey in instance) {
            if (shared_utils_1.isFunction(propertyKey))
                continue;
            const property = String(propertyKey);
            const isClient = Reflect.getMetadata(constants_1.CLIENT_METADATA, instance, property);
            if (shared_utils_1.isUndefined(isClient))
                continue;
            const metadata = Reflect.getMetadata(constants_1.CLIENT_CONFIGURATION_METADATA, instance, property);
            yield { property, metadata };
        }
    }
}
exports.ListenerMetadataExplorer = ListenerMetadataExplorer;
