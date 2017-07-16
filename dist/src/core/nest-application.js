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
const iterare_1 = require("iterare");
const middlewares_module_1 = require("./middlewares/middlewares-module");
const socket_module_1 = require("@nestjs/websockets/socket-module");
const express_adapter_1 = require("./adapters/express-adapter");
const routes_resolver_1 = require("./router/routes-resolver");
const logger_service_1 = require("@nestjs/common/services/logger.service");
const constants_1 = require("./constants");
const microservices_module_1 = require("@nestjs/microservices/microservices-module");
const application_config_1 = require("./application-config");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const index_1 = require("./index");
class NestApplication {
    constructor(container, express) {
        this.container = container;
        this.express = express;
        this.config = new application_config_1.ApplicationConfig();
        this.logger = new logger_service_1.Logger(NestApplication.name);
        this.routesResolver = null;
        this.microservices = [];
        this.isInitialized = false;
        this.server = null;
        this.routesResolver = new routes_resolver_1.RoutesResolver(container, express_adapter_1.ExpressAdapter, this.config);
    }
    setupModules() {
        return __awaiter(this, void 0, void 0, function* () {
            socket_module_1.SocketModule.setup(this.container, this.config);
            microservices_module_1.MicroservicesModule.setupClients(this.container);
            yield middlewares_module_1.MiddlewaresModule.setup(this.container, this.config);
        });
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setupModules();
            const router = express_adapter_1.ExpressAdapter.createRouter();
            this.setupMiddlewares(router);
            this.setupRoutes(router);
            this.express.use(shared_utils_1.validatePath(this.config.getGlobalPrefix()), router);
            this.callInitHook();
            this.logger.log(constants_1.messages.APPLICATION_READY);
            this.isInitialized = true;
        });
    }
    connectMicroservice(config) {
        const instance = new index_1.NestMicroservice(this.container, config);
        instance.setupListeners();
        instance.setIsInitialized(true);
        this.microservices.push(instance);
        return instance;
    }
    getMicroservices() {
        return this.microservices;
    }
    startAllMicroservices(callback) {
        Promise.all(this.microservices.map(this.listenToPromise)).then(callback);
    }
    listen(port, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            (!this.isInitialized) && (yield this.init());
            this.server = this.express.listen(port, callback);
            return this.server;
        });
    }
    close() {
        socket_module_1.SocketModule.close();
        this.server && this.server.close();
        this.microservices.forEach((microservice) => {
            microservice.setIsTerminated(true);
            microservice.close();
        });
        this.callDestroyHook();
    }
    setGlobalPrefix(prefix) {
        this.config.setGlobalPrefix(prefix);
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
    setupMiddlewares(instance) {
        return __awaiter(this, void 0, void 0, function* () {
            yield middlewares_module_1.MiddlewaresModule.setupMiddlewares(instance);
        });
    }
    setupRoutes(instance) {
        this.routesResolver.resolve(instance);
    }
    listenToPromise(microservice) {
        return new Promise((resolve, reject) => {
            microservice.listen(resolve);
        });
    }
    callInitHook() {
        const modules = this.container.getModules();
        modules.forEach((module) => {
            this.callModuleInitHook(module);
        });
    }
    callModuleInitHook(module) {
        const components = [...module.routes, ...module.components];
        iterare_1.default(components).map(([key, { instance }]) => instance)
            .filter((instance) => !shared_utils_1.isNil(instance))
            .filter(this.hasOnModuleInitHook)
            .forEach((instance) => instance.onModuleInit());
    }
    hasOnModuleInitHook(instance) {
        return !shared_utils_1.isUndefined(instance.onModuleInit);
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
exports.NestApplication = NestApplication;
//# sourceMappingURL=nest-application.js.map