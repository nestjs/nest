"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../constants");
/**
 * Defines the Gateway. The gateway can inject dependencies through constructor.
 * Those dependencies should belongs to the same module. Gateway is listening on the specified port.
 */
exports.WebSocketGateway = (metadataOrPort) => {
    if (Number.isInteger(metadataOrPort)) {
        metadataOrPort = { port: metadataOrPort };
    }
    const metadata = metadataOrPort || {};
    return (target) => {
        Reflect.defineMetadata(constants_1.GATEWAY_METADATA, true, target);
        Reflect.defineMetadata(constants_1.NAMESPACE_METADATA, metadata.namespace, target);
        Reflect.defineMetadata(constants_1.PORT_METADATA, metadata.port, target);
        Reflect.defineMetadata(constants_1.GATEWAY_MIDDLEWARES, metadata.middlewares, target);
    };
};
