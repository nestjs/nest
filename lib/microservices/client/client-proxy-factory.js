"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_tcp_1 = require("./client-tcp");
const client_redis_1 = require("./client-redis");
const transport_enum_1 = require("../enums/transport.enum");
class ClientProxyFactory {
    static create(metadata) {
        const { transport } = metadata;
        switch (transport) {
            case transport_enum_1.Transport.REDIS:
                return new client_redis_1.ClientRedis(metadata);
            default:
                return new client_tcp_1.ClientTCP(metadata);
        }
    }
}
exports.ClientProxyFactory = ClientProxyFactory;
