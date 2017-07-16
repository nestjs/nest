"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../constants");
exports.WebSocketGateway = (metadata) => {
    metadata = metadata || {};
    return (target) => {
        Reflect.defineMetadata(constants_1.GATEWAY_METADATA, true, target);
        Reflect.defineMetadata(constants_1.NAMESPACE_METADATA, metadata.namespace, target);
        Reflect.defineMetadata(constants_1.PORT_METADATA, metadata.port, target);
        Reflect.defineMetadata(constants_1.GATEWAY_MIDDLEWARES, metadata.middlewares, target);
    };
};
//# sourceMappingURL=socket-gateway.decorator.js.map