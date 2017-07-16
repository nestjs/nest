"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const listener_metadata_explorer_1 = require("./listener-metadata-explorer");
const client_proxy_factory_1 = require("./client/client-proxy-factory");
const metadata_scanner_1 = require("@nestjs/core/metadata-scanner");
class ListenersController {
    constructor(clientsContainer) {
        this.clientsContainer = clientsContainer;
        this.metadataExplorer = new listener_metadata_explorer_1.ListenerMetadataExplorer(new metadata_scanner_1.MetadataScanner());
    }
    bindPatternHandlers(instance, server) {
        const patternHandlers = this.metadataExplorer.explore(instance);
        patternHandlers.forEach(({ pattern, targetCallback }) => server.add(pattern, targetCallback));
    }
    bindClientsToProperties(instance) {
        for (const { property, metadata } of this.metadataExplorer.scanForClientHooks(instance)) {
            const client = client_proxy_factory_1.ClientProxyFactory.create(metadata);
            this.clientsContainer.addClient(client);
            Reflect.set(instance, property, client);
        }
    }
}
exports.ListenersController = ListenersController;
//# sourceMappingURL=listeners-controller.js.map