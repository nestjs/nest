"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ClientsContainer {
    constructor() {
        this.clients = [];
    }
    getAllClients() {
        return this.clients;
    }
    addClient(client) {
        this.clients.push(client);
    }
    clear() {
        this.clients = [];
    }
}
exports.ClientsContainer = ClientsContainer;
