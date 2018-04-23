"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const iterare_1 = require("iterare");
const container_1 = require("./container");
const web_sockets_controller_1 = require("./web-sockets-controller");
const socket_server_provider_1 = require("./socket-server-provider");
const constants_1 = require("./constants");
const ws_context_creator_1 = require("./context/ws-context-creator");
const ws_proxy_1 = require("./context/ws-proxy");
const exception_filters_context_1 = require("./context/exception-filters-context");
const pipes_consumer_1 = require("@nestjs/core/pipes/pipes-consumer");
const pipes_context_creator_1 = require("@nestjs/core/pipes/pipes-context-creator");
const guards_context_creator_1 = require("@nestjs/core/guards/guards-context-creator");
const guards_consumer_1 = require("@nestjs/core/guards/guards-consumer");
const interceptors_context_creator_1 = require("@nestjs/core/interceptors/interceptors-context-creator");
const interceptors_consumer_1 = require("@nestjs/core/interceptors/interceptors-consumer");
class SocketModule {
    constructor() {
        this.socketsContainer = new container_1.SocketsContainer();
    }
    register(container, config) {
        this.applicationConfig = config;
        this.webSocketsController = new web_sockets_controller_1.WebSocketsController(new socket_server_provider_1.SocketServerProvider(this.socketsContainer, config), container, config, this.getContextCreator(container));
        const modules = container.getModules();
        modules.forEach(({ components }, moduleName) => this.hookGatewaysIntoServers(components, moduleName));
    }
    hookGatewaysIntoServers(components, moduleName) {
        components.forEach(wrapper => this.hookGatewayIntoServer(wrapper, moduleName));
    }
    hookGatewayIntoServer(wrapper, moduleName) {
        const { instance, metatype, isNotMetatype } = wrapper;
        if (isNotMetatype) {
            return;
        }
        const metadataKeys = Reflect.getMetadataKeys(metatype);
        if (metadataKeys.indexOf(constants_1.GATEWAY_METADATA) < 0) {
            return;
        }
        this.webSocketsController.hookGatewayIntoServer(instance, metatype, moduleName);
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.applicationConfig) {
                return void 0;
            }
            const adapter = this.applicationConfig.getIoAdapter();
            const servers = this.socketsContainer.getAllServers();
            yield Promise.all(iterare_1.default(servers.values()).map(({ server }) => __awaiter(this, void 0, void 0, function* () { return server && (yield adapter.close(server)); })));
            this.socketsContainer.clear();
        });
    }
    getContextCreator(container) {
        return new ws_context_creator_1.WsContextCreator(new ws_proxy_1.WsProxy(), new exception_filters_context_1.ExceptionFiltersContext(container), new pipes_context_creator_1.PipesContextCreator(container), new pipes_consumer_1.PipesConsumer(), new guards_context_creator_1.GuardsContextCreator(container), new guards_consumer_1.GuardsConsumer(), new interceptors_context_creator_1.InterceptorsContextCreator(container), new interceptors_consumer_1.InterceptorsConsumer());
    }
}
exports.SocketModule = SocketModule;
