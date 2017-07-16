"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const client_proxy_factory_1 = require("../../client/client-proxy-factory");
const client_tcp_1 = require("../../client/client-tcp");
const transport_enum_1 = require("../../enums/transport.enum");
const client_redis_1 = require("../../client/client-redis");
describe('ClientProxyFactory', () => {
    describe('create', () => {
        it(`should create tcp client by default`, () => {
            const proxy = client_proxy_factory_1.ClientProxyFactory.create({});
            chai_1.expect(proxy instanceof client_tcp_1.ClientTCP).to.be.true;
        });
        it(`should create redis client`, () => {
            const proxy = client_proxy_factory_1.ClientProxyFactory.create({ transport: transport_enum_1.Transport.REDIS });
            chai_1.expect(proxy instanceof client_redis_1.ClientRedis).to.be.true;
        });
    });
});
//# sourceMappingURL=client-proxy-factory.spec.js.map