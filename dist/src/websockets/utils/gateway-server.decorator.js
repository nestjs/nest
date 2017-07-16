"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../constants");
exports.WebSocketServer = () => {
    return (target, propertyKey) => {
        Reflect.set(target, propertyKey, null);
        Reflect.defineMetadata(constants_1.GATEWAY_SERVER_METADATA, true, target, propertyKey);
    };
};
//# sourceMappingURL=gateway-server.decorator.js.map