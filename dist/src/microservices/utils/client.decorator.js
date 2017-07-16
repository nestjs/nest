"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../constants");
exports.Client = (metadata) => {
    return (target, propertyKey) => {
        Reflect.set(target, propertyKey, null);
        Reflect.defineMetadata(constants_1.CLIENT_METADATA, true, target, propertyKey);
        Reflect.defineMetadata(constants_1.CLIENT_CONFIGURATION_METADATA, metadata, target, propertyKey);
    };
};
//# sourceMappingURL=client.decorator.js.map