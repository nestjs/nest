"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const observable_socket_1 = require("../observable-socket");
const ReplaySubject_1 = require("rxjs/ReplaySubject");
const Subject_1 = require("rxjs/Subject");
describe('ObservableSocket', () => {
    describe('create', () => {
        it(`should return expected observable socket object`, () => {
            const server = { test: 'test' };
            const result = observable_socket_1.ObservableSocket.create(server);
            chai_1.expect(result).to.have.keys('init', 'connection', 'disconnect', 'server');
            chai_1.expect(result.init instanceof ReplaySubject_1.ReplaySubject).to.be.true;
            chai_1.expect(result.connection instanceof Subject_1.Subject).to.be.true;
            chai_1.expect(result.disconnect instanceof Subject_1.Subject).to.be.true;
            chai_1.expect(result.server).to.be.eql(server);
        });
    });
});
//# sourceMappingURL=observable-socket.spec.js.map