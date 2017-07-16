"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const container_1 = require("../container");
describe('ClientsContainer', () => {
    let instance;
    beforeEach(() => {
        instance = new container_1.ClientsContainer();
    });
    describe('getAllClients', () => {
        it('should returns array of clients', () => {
            const clients = [1, 2, 3];
            instance.clients = clients;
            chai_1.expect(instance.getAllClients()).to.be.eql(clients);
        });
    });
    describe('addClient', () => {
        it('should push client into clients array', () => {
            const client = 'test';
            instance.addClient(client);
            chai_1.expect(instance.getAllClients()).to.be.deep.equal([client]);
        });
    });
    describe('clear', () => {
        it('should remove all clients', () => {
            const clients = [1, 2, 3];
            instance.clients = clients;
            instance.clear();
            chai_1.expect(instance.getAllClients()).to.be.deep.equal([]);
        });
    });
});
//# sourceMappingURL=container.spec.js.map