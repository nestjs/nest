"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const server_factory_1 = require("../../server/server-factory");
const server_tcp_1 = require("../../server/server-tcp");
const server_redis_1 = require("../../server/server-redis");
const transport_enum_1 = require("../../enums/transport.enum");
describe('ServerFactory', () => {
    describe('create', () => {
        it(`should return tcp server by default`, () => {
            chai_1.expect(server_factory_1.ServerFactory.create({}) instanceof server_tcp_1.ServerTCP).to.be.true;
        });
        it(`should return redis server if transport is set to redis`, () => {
            chai_1.expect(server_factory_1.ServerFactory.create({ transport: transport_enum_1.Transport.REDIS }) instanceof server_redis_1.ServerRedis).to.be.true;
        });
    });
});
//# sourceMappingURL=server-factory.spec.js.map