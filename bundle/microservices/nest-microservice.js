"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_service_1 = require("@nestjs/common/services/logger.service");
const constants_1 = require("@nestjs/core/constants");
const nest_application_context_1 = require("@nestjs/core/nest-application-context");
const optional = require("optional");
const transport_enum_1 = require("./enums/transport.enum");
const microservices_module_1 = require("./microservices-module");
const server_factory_1 = require("./server/server-factory");
const { SocketModule } = optional('@nestjs/websockets/socket-module') || {};
const { IoAdapter } = optional('@nestjs/websockets/adapters/io-adapter') || {};
class NestMicroservice extends nest_application_context_1.NestApplicationContext {
    constructor(container, config = {}, applicationConfig) {
        super(container, [], null);
        this.applicationConfig = applicationConfig;
        this.logger = new logger_service_1.Logger(NestMicroservice.name, true);
        this.microservicesModule = new microservices_module_1.MicroservicesModule();
        this.socketModule = SocketModule ? new SocketModule() : null;
        this.isTerminated = false;
        this.isInitialized = false;
        this.isInitHookCalled = false;
        this.registerWsAdapter();
        this.microservicesModule.register(container, this.applicationConfig);
        this.createServer(config);
        this.selectContextModule();
    }
    registerWsAdapter() {
        const ioAdapter = IoAdapter ? new IoAdapter() : null;
        this.applicationConfig.setIoAdapter(ioAdapter);
    }
    createServer(config) {
        try {
            this.microserviceConfig = Object.assign({ transport: transport_enum_1.Transport.TCP }, config);
            const { strategy } = config;
            this.server = strategy
                ? strategy
                : server_factory_1.ServerFactory.create(this.microserviceConfig);
        }
        catch (e) {
            this.logger.error(e);
            throw e;
        }
    }
    async registerModules() {
        this.socketModule &&
            this.socketModule.register(this.container, this.applicationConfig);
        this.microservicesModule.setupClients(this.container);
        this.registerListeners();
        this.setIsInitialized(true);
        if (!this.isInitHookCalled) {
            await this.callInitHook();
            await this.callBootstrapHook();
        }
    }
    registerListeners() {
        this.microservicesModule.setupListeners(this.container, this.server);
    }
    useWebSocketAdapter(adapter) {
        this.applicationConfig.setIoAdapter(adapter);
        return this;
    }
    useGlobalFilters(...filters) {
        this.applicationConfig.useGlobalFilters(...filters);
        return this;
    }
    useGlobalPipes(...pipes) {
        this.applicationConfig.useGlobalPipes(...pipes);
        return this;
    }
    useGlobalInterceptors(...interceptors) {
        this.applicationConfig.useGlobalInterceptors(...interceptors);
        return this;
    }
    useGlobalGuards(...guards) {
        this.applicationConfig.useGlobalGuards(...guards);
        return this;
    }
    listen(callback) {
        !this.isInitialized && this.registerModules();
        this.logger.log(constants_1.messages.MICROSERVICE_READY);
        this.server.listen(callback);
    }
    async listenAsync() {
        return await new Promise(resolve => this.listen(resolve));
    }
    async close() {
        await this.server.close();
        !this.isTerminated && (await this.closeApplication());
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
    async closeApplication() {
        this.socketModule && (await this.socketModule.close());
        await super.close();
        this.setIsTerminated(true);
    }
}
exports.NestMicroservice = NestMicroservice;
