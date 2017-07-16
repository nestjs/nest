"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const listeners_controller_1 = require("./listeners-controller");
const container_1 = require("./container");
class MicroservicesModule {
    static setupListeners(container, server) {
        const modules = container.getModules();
        modules.forEach(({ routes }) => this.bindListeners(routes, server));
    }
    static setupClients(container) {
        const modules = container.getModules();
        modules.forEach(({ routes, components }) => {
            this.bindClients(routes);
            this.bindClients(components);
        });
    }
    static bindListeners(controllers, server) {
        controllers.forEach(({ instance }) => {
            this.listenersController.bindPatternHandlers(instance, server);
        });
    }
    static bindClients(controllers) {
        controllers.forEach(({ instance, isNotMetatype }) => {
            !isNotMetatype && this.listenersController.bindClientsToProperties(instance);
        });
    }
    static close() {
        const clients = this.clientsContainer.getAllClients();
        clients.forEach((client) => client.close());
        this.clientsContainer.clear();
    }
}
MicroservicesModule.clientsContainer = new container_1.ClientsContainer();
MicroservicesModule.listenersController = new listeners_controller_1.ListenersController(MicroservicesModule.clientsContainer);
exports.MicroservicesModule = MicroservicesModule;
//# sourceMappingURL=microservices-module.js.map