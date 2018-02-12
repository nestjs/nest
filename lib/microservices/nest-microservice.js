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
const optional = require("optional");
const iterare_1 = require("iterare");
const microservices_module_1 = require("./microservices-module");
const constants_1 = require("@nestjs/core/constants");
const logger_service_1 = require("@nestjs/common/services/logger.service");
const server_factory_1 = require("./server/server-factory");
const transport_enum_1 = require("./enums/transport.enum");
const application_config_1 = require("@nestjs/core/application-config");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const nest_application_context_1 = require("@nestjs/core/nest-application-context");
const { SocketModule } = optional('@nestjs/websockets/socket-module') || {};
const { IoAdapter } = optional('@nestjs/websockets/adapters/io-adapter') || {};
class NestMicroservice extends nest_application_context_1.NestApplicationContext {
    constructor(container, config = {}) {
        super(container, [], null);
        this.logger = new logger_service_1.Logger(NestMicroservice.name, true);
        this.microservicesModule = new microservices_module_1.MicroservicesModule();
        this.socketModule = SocketModule ? new SocketModule() : null;
        this.isTerminated = false;
        this.isInitialized = false;
        this.isInitHookCalled = false;
        const ioAdapter = IoAdapter ? new IoAdapter() : null;
        this.config = new application_config_1.ApplicationConfig(ioAdapter);
        this.microservicesModule.setup(container, this.config);
        this.microserviceConfig = Object.assign({ transport: transport_enum_1.Transport.TCP }, config);
        const { strategy } = config;
        this.server = strategy
            ? strategy
            : server_factory_1.ServerFactory.create(this.microserviceConfig);
    }
    setupModules() {
        this.socketModule && this.socketModule.setup(this.container, this.config);
        this.microservicesModule.setupClients(this.container);
        this.setupListeners();
        this.setIsInitialized(true);
        !this.isInitHookCalled && this.callInitHook();
    }
    setupListeners() {
        this.microservicesModule.setupListeners(this.container, this.server);
    }
    useWebSocketAdapter(adapter) {
        this.config.setIoAdapter(adapter);
    }
    useGlobalFilters(...filters) {
        this.config.useGlobalFilters(...filters);
    }
    useGlobalPipes(...pipes) {
        this.config.useGlobalPipes(...pipes);
    }
    useGlobalInterceptors(...interceptors) {
        this.config.useGlobalInterceptors(...interceptors);
    }
    useGlobalGuards(...guards) {
        this.config.useGlobalGuards(...guards);
    }
    listen(callback) {
        !this.isInitialized && this.setupModules();
        this.logger.log(constants_1.messages.MICROSERVICE_READY);
        this.server.listen(callback);
    }
    listenAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield new Promise((resolve) => this.listen(resolve));
        });
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
    setIsInitHookCalled(isInitHookCalled) {
        this.isInitHookCalled = isInitHookCalled;
    }
    closeApplication() {
        this.socketModule && this.socketModule.close();
        this.callDestroyHook();
        this.setIsTerminated(true);
    }
    callInitHook() {
        const modules = this.container.getModules();
        modules.forEach(module => {
            this.callModuleInitHook(module);
        });
        this.setIsInitHookCalled(true);
    }
    callModuleInitHook(module) {
        const components = [...module.routes, ...module.components];
        iterare_1.default(components)
            .map(([key, { instance }]) => instance)
            .filter(instance => !shared_utils_1.isNil(instance))
            .filter(this.hasOnModuleInitHook)
            .forEach(instance => instance.onModuleInit());
    }
    hasOnModuleInitHook(instance) {
        return !shared_utils_1.isUndefined(instance.onModuleInit);
    }
    callDestroyHook() {
        const modules = this.container.getModules();
        modules.forEach(module => {
            this.callModuleDestroyHook(module);
        });
    }
    callModuleDestroyHook(module) {
        const components = [...module.routes, ...module.components];
        iterare_1.default(components)
            .map(([key, { instance }]) => instance)
            .filter(instance => !shared_utils_1.isNil(instance))
            .filter(this.hasOnModuleDestroyHook)
            .forEach(instance => instance.onModuleDestroy());
    }
    hasOnModuleDestroyHook(instance) {
        return !shared_utils_1.isUndefined(instance.onModuleDestroy);
    }
}
exports.NestMicroservice = NestMicroservice;
