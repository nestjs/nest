"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_tcp_1 = require("./server-tcp");
const server_redis_1 = require("./server-redis");
const transport_enum_1 = require("../enums/transport.enum");
const server_nats_1 = require("./server-nats");
const server_stan_1 = require("./server-stan");
class ServerFactory {
    static create(options) {
        const { transport } = options;
        switch (transport) {
            case transport_enum_1.Transport.REDIS:
                return new server_redis_1.ServerRedis(options);
            case transport_enum_1.Transport.NATS:
                return new server_nats_1.ServerNats(options);
            case transport_enum_1.Transport.STAN:
                return new server_stan_1.ServerStan(options);
            default:
                return new server_tcp_1.ServerTCP(options);
        }
    }
}
exports.ServerFactory = ServerFactory;
