"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const constants_1 = require("./constants");
class GatewayMetadataExplorer {
    constructor(metadataScanner) {
        this.metadataScanner = metadataScanner;
    }
    explore(instance) {
        const instancePrototype = Object.getPrototypeOf(instance);
        return this.metadataScanner.scanFromPrototype(instance, instancePrototype, (method) => this.exploreMethodMetadata(instance, instancePrototype, method));
    }
    exploreMethodMetadata(instance, instancePrototype, methodName) {
        const callbackMethod = instancePrototype[methodName];
        const isMessageMapping = Reflect.getMetadata(constants_1.MESSAGE_MAPPING_METADATA, callbackMethod);
        if (shared_utils_1.isUndefined(isMessageMapping)) {
            return null;
        }
        const message = Reflect.getMetadata(constants_1.MESSAGE_METADATA, callbackMethod);
        return {
            callback: callbackMethod.bind(instance),
            message,
        };
    }
    *scanForServerHooks(instance) {
        for (const propertyKey in instance) {
            if (shared_utils_1.isFunction(propertyKey))
                continue;
            const property = String(propertyKey);
            const isServer = Reflect.getMetadata(constants_1.GATEWAY_SERVER_METADATA, instance, property);
            if (shared_utils_1.isUndefined(isServer))
                continue;
            yield property;
        }
    }
}
exports.GatewayMetadataExplorer = GatewayMetadataExplorer;
//# sourceMappingURL=gateway-metadata-explorer.js.map