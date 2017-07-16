"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const container_1 = require("./container");
const web_sockets_controller_1 = require("./web-sockets-controller");
const socket_server_provider_1 = require("./socket-server-provider");
const constants_1 = require("./constants");
class SocketModule {
    static setup(container, config) {
        this.webSocketsController = new web_sockets_controller_1.WebSocketsController(new socket_server_provider_1.SocketServerProvider(this.socketsContainer, config), container, config);
        const modules = container.getModules();
        modules.forEach(({ components }, moduleName) => this.hookGatewaysIntoServers(components, moduleName));
    }
    static hookGatewaysIntoServers(components, moduleName) {
        components.forEach(({ instance, metatype, isNotMetatype }) => {
            if (isNotMetatype)
                return;
            const metadataKeys = Reflect.getMetadataKeys(metatype);
            if (metadataKeys.indexOf(constants_1.GATEWAY_METADATA) < 0)
                return;
            this.webSocketsController.hookGatewayIntoServer(instance, metatype, moduleName);
        });
    }
    static close() {
        const servers = this.socketsContainer.getAllServers();
        servers.forEach(({ server }) => server.close());
        this.socketsContainer.clear();
    }
}
SocketModule.socketsContainer = new container_1.SocketsContainer();
exports.SocketModule = SocketModule;
//# sourceMappingURL=socket-module.js.map