"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transport_enum_1 = require("../enums/transport.enum");
const server_grpc_1 = require("./server-grpc");
const server_mqtt_1 = require("./server-mqtt");
const server_nats_1 = require("./server-nats");
const server_redis_1 = require("./server-redis");
const server_tcp_1 = require("./server-tcp");
class ServerFactory {
    static create(options) {
        const { transport } = options;
        switch (transport) {
            case transport_enum_1.Transport.REDIS:
                return new server_redis_1.ServerRedis(options);
            case transport_enum_1.Transport.NATS:
                return new server_nats_1.ServerNats(options);
            case transport_enum_1.Transport.MQTT:
                return new server_mqtt_1.ServerMqtt(options);
            case transport_enum_1.Transport.GRPC:
                return new server_grpc_1.ServerGrpc(options);
            default:
                return new server_tcp_1.ServerTCP(options);
        }
    }
}
exports.ServerFactory = ServerFactory;
