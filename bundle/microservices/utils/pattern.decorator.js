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
/**
 * Registers gRPC route handler for specified service.
 */
exports.GrpcRoute = (service, rpc) => exports.MessagePattern({ service, rpc });
