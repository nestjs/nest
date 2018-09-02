"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transport_enum_1 = require("../enums/transport.enum");
const client_grpc_1 = require("./client-grpc");
const client_mqtt_1 = require("./client-mqtt");
const client_nats_1 = require("./client-nats");
const client_redis_1 = require("./client-redis");
const client_tcp_1 = require("./client-tcp");
class ClientProxyFactory {
    static create(clientOptions) {
        const { transport, options } = clientOptions;
        switch (transport) {
            case transport_enum_1.Transport.REDIS:
                return new client_redis_1.ClientRedis(options);
            case transport_enum_1.Transport.NATS:
                return new client_nats_1.ClientNats(options);
            case transport_enum_1.Transport.MQTT:
                return new client_mqtt_1.ClientMqtt(options);
            case transport_enum_1.Transport.GRPC:
                return new client_grpc_1.ClientGrpcProxy(options);
            default:
                return new client_tcp_1.ClientTCP(options);
        }
    }
}
exports.ClientProxyFactory = ClientProxyFactory;
