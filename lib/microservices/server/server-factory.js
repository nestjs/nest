"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_tcp_1 = require("./server-tcp");
const server_redis_1 = require("./server-redis");
const transport_enum_1 = require("../enums/transport.enum");
class ServerFactory {
    static create(config) {
        const { transport } = config;
        switch (transport) {
            case transport_enum_1.Transport.REDIS:
                return new server_redis_1.ServerRedis(config);
            default:
                return new server_tcp_1.ServerTCP(config);
        }
    }
}
exports.ServerFactory = ServerFactory;
