"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const container_1 = require("../container");
describe('SocketsContainer', () => {
    const namespace = 'test';
    const port = 30;
    let instance;
    let getSpy, setSpy;
    beforeEach(() => {
        setSpy = sinon.spy();
        getSpy = sinon.spy();
        instance = new container_1.SocketsContainer();
        instance['observableServers'] = {
            get: getSpy,
            set: setSpy
        };
    });
    describe('getSocketServer', () => {
        it(`should call "observableServers" get method with expected arguments`, () => {
            instance.getServer(namespace, port);
            chai_1.expect(getSpy.calledWith({ namespace, port }));
        });
    });
    describe('storeObservableServer', () => {
        it(`should call "observableServers" set method with expected arguments`, () => {
            const server = {};
            instance.addServer(namespace, port, server);
            chai_1.expect(setSpy.calledWith({ namespace, port }, server));
        });
    });
});
//# sourceMappingURL=container.spec.js.map