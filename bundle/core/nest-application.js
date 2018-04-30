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
const cors = require("cors");
const http = require("http");
const https = require("https");
const optional = require("optional");
const bodyParser = require("body-parser");
const iterare_1 = require("iterare");
const logger_service_1 = require("@nestjs/common/services/logger.service");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const application_config_1 = require("./application-config");
const constants_1 = require("./constants");
const middleware_module_1 = require("./middleware/middleware-module");
const routes_resolver_1 = require("./router/routes-resolver");
const microservices_package_not_found_exception_1 = require("./errors/exceptions/microservices-package-not-found.exception");
const container_1 = require("./middleware/container");
const nest_application_context_1 = require("./nest-application-context");
const express_adapter_1 = require("./adapters/express-adapter");
const fastify_adapter_1 = require("./adapters/fastify-adapter");
const load_package_util_1 = require("@nestjs/common/utils/load-package.util");
const { SocketModule } = optional('@nestjs/websockets/socket-module') || {};
const { MicroservicesModule } = optional('@nestjs/microservices/microservices-module') || {};
const { NestMicroservice } = optional('@nestjs/microservices/nest-microservice') || {};
const { IoAdapter } = optional('@nestjs/websockets/adapters/io-adapter') || {};
class NestApplication extends nest_application_context_1.NestApplicationContext {
    constructor(container, httpAdapter, config, appOptions = {}) {
        super(container, [], null);
        this.httpAdapter = httpAdapter;
        this.config = config;
        this.appOptions = appOptions;
        this.logger = new logger_service_1.Logger(NestApplication.name, true);
        this.middlewareModule = new middleware_module_1.MiddlewareModule();
        this.middlewareContainer = new container_1.MiddlewareContainer();
        this.microservicesModule = MicroservicesModule
            ? new MicroservicesModule()
            : null;
        this.socketModule = SocketModule ? new SocketModule() : null;
        this.microservices = [];
        this.isInitialized = false;
        this.applyOptions();
        this.selectContextModule();
        this.registerHttpServer();
        this.routesResolver = new routes_resolver_1.RoutesResolver(this.container, this.config);
    }
    registerHttpServer() {
        this.httpServer = this.createServer();
        const server = this.getUnderlyingHttpServer();
        const ioAdapter = IoAdapter ? new IoAdapter(server) : null;
        this.config.setIoAdapter(ioAdapter);
    }
    applyOptions() {
        if (!this.appOptions || !this.appOptions.cors) {
            return undefined;
        }
        const isCorsOptionsObj = shared_utils_1.isObject(this.appOptions.cors);
        if (!isCorsOptionsObj) {
            return this.enableCors();
        }
        this.enableCors(this.appOptions.cors);
    }
    createServer() {
        const isHttpsEnabled = this.appOptions && this.appOptions.httpsOptions;
        const isExpress = this.isExpress();
        if (isHttpsEnabled && isExpress) {
            return https.createServer(this.appOptions.httpsOptions, this.httpAdapter.getHttpServer());
        }
        if (isExpress) {
            return http.createServer(this.httpAdapter.getHttpServer());
        }
        return this.httpAdapter;
    }
    getUnderlyingHttpServer() {
        return this.isExpress()
            ? this.httpServer
            : this.httpAdapter.getHttpServer();
    }
    registerModules() {
        return __awaiter(this, void 0, void 0, function* () {
            this.socketModule &&
                this.socketModule.register(this.container, this.config);
            if (this.microservicesModule) {
                this.microservicesModule.register(this.container, this.config);
                this.microservicesModule.setupClients(this.container);
            }
            yield this.middlewareModule.register(this.middlewareContainer, this.container, this.config);
        });
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            const useBodyParser = this.appOptions && this.appOptions.bodyParser !== false;
            useBodyParser && this.registerParserMiddleware();
            yield this.registerModules();
            yield this.registerRouter();
            yield this.callInitHook();
            this.isInitialized = true;
            this.logger.log(constants_1.messages.APPLICATION_READY);
            return this;
        });
    }
    registerParserMiddleware() {
        if (this.httpAdapter instanceof fastify_adapter_1.FastifyAdapter) {
            return this.httpAdapter.register(this.loadPackage('fastify-formbody', 'FastifyAdapter'));
        }
        if (!this.isExpress()) {
            return undefined;
        }
        const parserMiddleware = {
            jsonParser: bodyParser.json(),
            urlencodedParser: bodyParser.urlencoded({ extended: true }),
        };
        Object.keys(parserMiddleware)
            .filter(parser => !this.isMiddlewareApplied(this.httpAdapter, parser))
            .forEach(parserKey => this.httpAdapter.use(parserMiddleware[parserKey]));
    }
    isMiddlewareApplied(httpAdapter, name) {
        const app = this.httpAdapter.getHttpServer();
        return (!!app._router &&
            !!app._router.stack &&
            shared_utils_1.isFunction(app._router.stack.filter) &&
            !!app._router.stack.filter(layer => layer && layer.handle && layer.handle.name === name).length);
    }
    registerRouter() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.registerMiddleware(this.httpAdapter);
            const prefix = this.config.getGlobalPrefix();
            const basePath = prefix ? shared_utils_1.validatePath(prefix) : '';
            this.routesResolver.resolve(this.httpAdapter, basePath);
        });
    }
    connectMicroservice(options) {
        if (!NestMicroservice) {
            throw new microservices_package_not_found_exception_1.MicroservicesPackageNotFoundException();
        }
        const applicationConfig = new application_config_1.ApplicationConfig();
        const instance = new NestMicroservice(this.container, options, applicationConfig);
        instance.registerListeners();
        instance.setIsInitialized(true);
        instance.setIsInitHookCalled(true);
        this.microservices.push(instance);
        return instance;
    }
    getMicroservices() {
        return this.microservices;
    }
    getHttpServer() {
        return this.httpServer;
    }
    startAllMicroservices(callback) {
        Promise.all(this.microservices.map(this.listenToPromise)).then(() => callback && callback());
        return this;
    }
    startAllMicroservicesAsync() {
        return new Promise(resolve => this.startAllMicroservices(resolve));
    }
    use(...args) {
        this.httpAdapter.use(...args);
        return this;
    }
    engine(...args) {
        if (!this.isExpress()) {
            return this;
        }
        this.httpAdapter.engine(...args);
        return this;
    }
    set(...args) {
        if (!this.isExpress()) {
            return this;
        }
        this.httpAdapter.set(...args);
        return this;
    }
    disable(...args) {
        if (!this.isExpress()) {
            return this;
        }
        this.httpAdapter.disable(...args);
        return this;
    }
    enable(...args) {
        if (!this.isExpress()) {
            return this;
        }
        this.httpAdapter.enable(...args);
        return this;
    }
    register(...args) {
        const adapter = this.httpAdapter;
        adapter.register && adapter.register(...args);
        return this;
    }
    inject(...args) {
        const adapter = this.httpAdapter;
        return adapter.inject && adapter.inject(...args);
    }
    enableCors(options) {
        this.httpAdapter.use(cors(options));
        return this;
    }
    listen(port, ...args) {
        return __awaiter(this, void 0, void 0, function* () {
            !this.isInitialized && (yield this.init());
            this.httpServer.listen(port, ...args);
            return this.httpServer;
        });
    }
    listenAsync(port, hostname) {
        return new Promise(resolve => {
            const server = this.listen(port, hostname, () => resolve(server));
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            this.socketModule && (yield this.socketModule.close());
            this.httpServer && this.httpServer.close();
            yield Promise.all(iterare_1.default(this.microservices).map((microservice) => __awaiter(this, void 0, void 0, function* () {
                microservice.setIsTerminated(true);
                yield microservice.close();
            })));
            yield this.callDestroyHook();
        });
    }
    setGlobalPrefix(prefix) {
        this.config.setGlobalPrefix(prefix);
        return this;
    }
    useWebSocketAdapter(adapter) {
        this.config.setIoAdapter(adapter);
        return this;
    }
    useGlobalFilters(...filters) {
        this.config.useGlobalFilters(...filters);
        return this;
    }
    useGlobalPipes(...pipes) {
        this.config.useGlobalPipes(...pipes);
        return this;
    }
    useGlobalInterceptors(...interceptors) {
        this.config.useGlobalInterceptors(...interceptors);
        return this;
    }
    useGlobalGuards(...guards) {
        this.config.useGlobalGuards(...guards);
        return this;
    }
    useStaticAssets(pathOrOptions, options) {
        this.httpAdapter.useStaticAssets &&
            this.httpAdapter.useStaticAssets(pathOrOptions, options);
        return this;
    }
    setBaseViewsDir(path) {
        this.httpAdapter.setBaseViewsDir && this.httpAdapter.setBaseViewsDir(path);
        return this;
    }
    setViewEngine(engineOrOptions) {
        this.httpAdapter.setViewEngine &&
            this.httpAdapter.setViewEngine(engineOrOptions);
        return this;
    }
    loadPackage(name, ctx) {
        return load_package_util_1.loadPackage(name, ctx);
    }
    registerMiddleware(instance) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.middlewareModule.registerMiddleware(this.middlewareContainer, instance);
        });
    }
    isExpress() {
        const isExpress = !this.httpAdapter.getHttpServer;
        if (isExpress) {
            return isExpress;
        }
        return this.httpAdapter instanceof express_adapter_1.ExpressAdapter;
    }
    listenToPromise(microservice) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            yield microservice.listen(resolve);
        }));
    }
    callDestroyHook() {
        return __awaiter(this, void 0, void 0, function* () {
            const modules = this.container.getModules();
            yield Promise.all(iterare_1.default(modules.values()).map((module) => __awaiter(this, void 0, void 0, function* () { return yield this.callModuleDestroyHook(module); })));
        });
    }
    callModuleDestroyHook(module) {
        return __awaiter(this, void 0, void 0, function* () {
            const components = [...module.routes, ...module.components];
            yield Promise.all(iterare_1.default(components)
                .map(([key, { instance }]) => instance)
                .filter(instance => !shared_utils_1.isNil(instance))
                .filter(this.hasOnModuleDestroyHook)
                .map((instance) => __awaiter(this, void 0, void 0, function* () { return yield instance.onModuleDestroy(); })));
        });
    }
    hasOnModuleDestroyHook(instance) {
        return !shared_utils_1.isUndefined(instance.onModuleDestroy);
    }
}
exports.NestApplication = NestApplication;
