"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const server_tcp_1 = require("../../server/server-tcp");
const constants_1 = require("../../constants");
describe('ServerTCP', () => {
    let server;
    beforeEach(() => {
        server = new server_tcp_1.ServerTCP({});
    });
    describe('bindHandler', () => {
        let getSocketInstance;
        const socket = { on: sinon.spy() };
        beforeEach(() => {
            getSocketInstance = sinon.stub(server, 'getSocketInstance').callsFake(() => socket);
        });
        it('should bind message event to handler', () => {
            server.bindHandler(null);
            chai_1.expect(socket.on.called).to.be.true;
        });
    });
    describe('close', () => {
        const tcpServer = { close: sinon.spy() };
        beforeEach(() => {
            server.server = tcpServer;
        });
        it('should close server', () => {
            server.close();
            chai_1.expect(tcpServer.close.called).to.be.true;
        });
    });
    describe('listen', () => {
        const serverMock = { listen: sinon.spy() };
        beforeEach(() => {
            server.server = serverMock;
        });
        it('should call native listen method with expected arguments', () => {
            const callback = () => { };
            server.listen(callback);
            chai_1.expect(serverMock.listen.calledWith(server.port, callback)).to.be.true;
        });
    });
    describe('handleMessage', () => {
        let socket;
        const msg = {
            pattern: 'test',
            data: 'tests',
        };
        beforeEach(() => {
            socket = {
                sendMessage: sinon.spy(),
            };
        });
        it('should send NO_PATTERN_MESSAGE error if key is not exists in handlers object', () => {
            server.handleMessage(socket, msg);
            chai_1.expect(socket.sendMessage.calledWith({ err: constants_1.NO_PATTERN_MESSAGE })).to.be.true;
        });
        it('should call handler if exists in handlers object', () => {
            const handler = sinon.spy();
            server.messageHandlers = {
                [JSON.stringify(msg.pattern)]: handler,
            };
            server.handleMessage(socket, msg);
            chai_1.expect(handler.calledOnce).to.be.true;
        });
    });
});
//# sourceMappingURL=server-tcp.spec.js.map