"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const iterare_1 = require("iterare");
const microservices_module_1 = require("@nestjs/microservices/microservices-module");
const constants_1 = require("./constants");
const logger_service_1 = require("@nestjs/common/services/logger.service");
const server_factory_1 = require("@nestjs/microservices/server/server-factory");
const transport_enum_1 = require("@nestjs/microservices/enums/transport.enum");
const application_config_1 = require("./application-config");
const socket_module_1 = require("@nestjs/websockets/socket-module");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
class NestMicroservice {
    constructor(container, config) {
        this.container = container;
        this.config = new application_config_1.ApplicationConfig();
        this.logger = new logger_service_1.Logger(NestMicroservice.name);
        this.isTerminated = false;
        this.isInitialized = false;
        this.microserviceConfig = Object.assign({ transport: transport_enum_1.Transport.TCP }, config);
        const { strategy } = config;
        if (strategy) {
            this.server = strategy;
            return;
        }
        this.server = server_factory_1.ServerFactory.create(this.microserviceConfig);
    }
    setupModules() {
        socket_module_1.SocketModule.setup(this.container, this.config);
        microservices_module_1.MicroservicesModule.setupClients(this.container);
        this.setupListeners();
        this.isInitialized = true;
    }
    setupListeners() {
        microservices_module_1.MicroservicesModule.setupListeners(this.container, this.server);
    }
    useWebSocketAdapter(adapter) {
        this.config.setIoAdapter(adapter);
    }
    listen(callback) {
        (!this.isInitialized) && this.setupModules();
        this.logger.log(constants_1.messages.MICROSERVICE_READY);
        this.server.listen(callback);
    }
    close() {
        this.server.close();
        !this.isTerminated && this.closeApplication();
    }
    setIsInitialized(isInitialized) {
        this.isInitialized = isInitialized;
    }
    setIsTerminated(isTerminaed) {
        this.isTerminated = isTerminaed;
    }
    closeApplication() {
        socket_module_1.SocketModule.close();
        this.callDestroyHook();
        this.setIsTerminated(true);
    }
    callDestroyHook() {
        const modules = this.container.getModules();
        modules.forEach((module) => {
            this.callModuleDestroyHook(module);
        });
    }
    callModuleDestroyHook(module) {
        const components = [...module.routes, ...module.components];
        iterare_1.default(components).map(([key, { instance }]) => instance)
            .filter((instance) => !shared_utils_1.isNil(instance))
            .filter(this.hasOnModuleDestroyHook)
            .forEach((instance) => instance.onModuleDestroy());
    }
    hasOnModuleDestroyHook(instance) {
        return !shared_utils_1.isUndefined(instance.onModuleDestroy);
    }
}
exports.NestMicroservice = NestMicroservice;
//# sourceMappingURL=nest-microservice.js.map