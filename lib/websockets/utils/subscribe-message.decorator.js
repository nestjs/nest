"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../constants");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
/**
 * Subscribes to the messages, which fulfils chosen pattern.
 */
exports.SubscribeMessage = (message) => {
    let metadata = shared_utils_1.isObject(message) ? message.value : message;
    metadata = shared_utils_1.isUndefined(metadata) ? '' : metadata;
    return (target, key, descriptor) => {
        Reflect.defineMetadata(constants_1.MESSAGE_MAPPING_METADATA, true, descriptor.value);
        Reflect.defineMetadata(constants_1.MESSAGE_METADATA, metadata, descriptor.value);
        return descriptor;
    };
};
