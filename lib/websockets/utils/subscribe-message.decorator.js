"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../constants");
/**
 * Subscribes to messages that fulfils chosen pattern.
 */
exports.SubscribeMessage = (message) => {
    return (target, key, descriptor) => {
        Reflect.defineMetadata(constants_1.MESSAGE_MAPPING_METADATA, true, descriptor.value);
        Reflect.defineMetadata(constants_1.MESSAGE_METADATA, message, descriptor.value);
        return descriptor;
    };
};
