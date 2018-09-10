"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_exception_1 = require("@nestjs/core/errors/exceptions/runtime.exception");
const guards_consumer_1 = require("@nestjs/core/guards/guards-consumer");
const guards_context_creator_1 = require("@nestjs/core/guards/guards-context-creator");
const interceptors_consumer_1 = require("@nestjs/core/interceptors/interceptors-consumer");
const interceptors_context_creator_1 = require("@nestjs/core/interceptors/interceptors-context-creator");
const pipes_consumer_1 = require("@nestjs/core/pipes/pipes-consumer");
const pipes_context_creator_1 = require("@nestjs/core/pipes/pipes-context-creator");
const container_1 = require("./container");
const exception_filters_context_1 = require("./context/exception-filters-context");
const rpc_context_creator_1 = require("./context/rpc-context-creator");
const rpc_proxy_1 = require("./context/rpc-proxy");
const listeners_controller_1 = require("./listeners-controller");
class MicroservicesModule {
    constructor() {
        this.clientsContainer = new container_1.ClientsContainer();
    }
    register(container, config) {
        const contextCreator = new rpc_context_creator_1.RpcContextCreator(new rpc_proxy_1.RpcProxy(), new exception_filters_context_1.ExceptionFiltersContext(container, config), new pipes_context_creator_1.PipesContextCreator(container, config), new pipes_consumer_1.PipesConsumer(), new guards_context_creator_1.GuardsContextCreator(container, config), new guards_consumer_1.GuardsConsumer(), new interceptors_context_creator_1.InterceptorsContextCreator(container, config), new interceptors_consumer_1.InterceptorsConsumer());
        this.listenersController = new listeners_controller_1.ListenersController(this.clientsContainer, contextCreator);
    }
    setupListeners(container, server) {
        if (!this.listenersController) {
            throw new runtime_exception_1.RuntimeException();
        }
        const modules = container.getModules();
        modules.forEach(({ routes }, module) => this.bindListeners(routes, server, module));
    }
    setupClients(container) {
        if (!this.listenersController) {
            throw new runtime_exception_1.RuntimeException();
        }
        const modules = container.getModules();
        modules.forEach(({ routes, components }) => {
            this.bindClients(routes);
            this.bindClients(components);
        });
    }
    bindListeners(controllers, server, module) {
        controllers.forEach(({ instance }) => this.listenersController.bindPatternHandlers(instance, server, module));
    }
    bindClients(items) {
        items.forEach(({ instance, isNotMetatype }) => {
            !isNotMetatype &&
                this.listenersController.bindClientsToProperties(instance);
        });
    }
    close() {
        const clients = this.clientsContainer.getAllClients();
        clients.forEach(client => client.close());
        this.clientsContainer.clear();
    }
}
exports.MicroservicesModule = MicroservicesModule;
