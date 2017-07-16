"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const socket_server_provider_1 = require("../socket-server-provider");
const container_1 = require("../container");
const application_config_1 = require("@nestjs/core/application-config");
describe('SocketServerProvider', () => {
    let instance;
    let socketsContainer, mockContainer;
    beforeEach(() => {
        socketsContainer = new container_1.SocketsContainer();
        mockContainer = sinon.mock(socketsContainer);
        instance = new socket_server_provider_1.SocketServerProvider(socketsContainer, new application_config_1.ApplicationConfig());
    });
    describe('scanForSocketServer', () => {
        let createSocketServerSpy;
        const namespace = 'test';
        const port = 30;
        beforeEach(() => {
            createSocketServerSpy = sinon.spy(instance, 'createSocketServer');
        });
        afterEach(() => {
            mockContainer.restore();
        });
        it(`should returns stored server`, () => {
            const server = { test: 'test' };
            mockContainer.expects('getServer').returns(server);
            const result = instance.scanForSocketServer(namespace, port);
            chai_1.expect(createSocketServerSpy.called).to.be.false;
            chai_1.expect(result).to.eq(server);
        });
        it(`should call "createSocketServer" when server is not stored already`, () => {
            mockContainer.expects('getServer').returns(null);
            instance.scanForSocketServer(namespace, port);
            chai_1.expect(createSocketServerSpy.called).to.be.true;
        });
    });
});
//# sourceMappingURL=socket-server-provider.spec.js.map