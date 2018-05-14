"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../constants");
/**
 * Subscribes to incoming messages which fulfils chosen pattern.
 */
exports.MessagePattern = (metadata) => {
    return (target, key, descriptor) => {
        Reflect.defineMetadata(constants_1.PATTERN_METADATA, metadata, descriptor.value);
        Reflect.defineMetadata(constants_1.PATTERN_HANDLER_METADATA, true, descriptor.value);
        return descriptor;
    };
};
function GrpcMethod(service, method) {
    return (target, key, descriptor) => {
        const metadata = createMethodMetadata(target, key, service, method);
        return exports.MessagePattern(metadata)(target, key, descriptor);
    };
}
exports.GrpcMethod = GrpcMethod;
function createMethodMetadata(target, key, service, method) {
    const capitalizeFirstLetter = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    if (!service) {
        const { name } = target.constructor;
        return { service: name, rpc: capitalizeFirstLetter(key) };
    }
    if (service && !method) {
        return { service, rpc: capitalizeFirstLetter(key) };
    }
    return { service, rpc: method };
}
exports.createMethodMetadata = createMethodMetadata;
