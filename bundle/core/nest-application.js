"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_service_1 = require("@nestjs/common/services/logger.service");
const load_package_util_1 = require("@nestjs/common/utils/load-package.util");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const https = require("https");
const iterare_1 = require("iterare");
const optional = require("optional");
const express_adapter_1 = require("./adapters/express-adapter");
const fastify_adapter_1 = require("./adapters/fastify-adapter");
const application_config_1 = require("./application-config");
const constants_1 = require("./constants");
const container_1 = require("./middleware/container");
const middleware_module_1 = require("./middleware/middleware-module");
const nest_application_context_1 = require("./nest-application-context");
const routes_resolver_1 = require("./router/routes-resolver");
const { SocketModule } = optional('@nestjs/websockets/socket-module') || {};
const { MicroservicesModule } = optional('@nestjs/microservices/microservices-module') || {};
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
    getHttpAdapter() {
        return this.httpAdapter;
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
            const server = https.createServer(this.appOptions.httpsOptions, this.httpAdapter.getInstance());
            this.httpAdapter.setHttpServer(server);
            return server;
        }
        if (isExpress) {
            const server = http.createServer(this.httpAdapter.getInstance());
            this.httpAdapter.setHttpServer(server);
            return server;
        }
        return this.httpAdapter;
    }
    getUnderlyingHttpServer() {
        return this.isExpress()
            ? this.httpServer
            : this.httpAdapter.getHttpServer();
    }
    async registerModules() {
        this.socketModule &&
            this.socketModule.register(this.container, this.config);
        if (this.microservicesModule) {
            this.microservicesModule.register(this.container, this.config);
            this.microservicesModule.setupClients(this.container);
        }
        await this.middlewareModule.register(this.middlewareContainer, this.container, this.config);
    }
    async init() {
        const useBodyParser = this.appOptions && this.appOptions.bodyParser !== false;
        useBodyParser && this.registerParserMiddleware();
        await this.registerModules();
        await this.registerRouter();
        await this.callInitHook();
        await this.registerRouterHooks();
        await this.callBootstrapHook();
        this.isInitialized = true;
        this.logger.log(constants_1.MESSAGES.APPLICATION_READY);
        return this;
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
        const app = httpAdapter.getInstance();
        return (!!app._router &&
            !!app._router.stack &&
            shared_utils_1.isFunction(app._router.stack.filter) &&
            app._router.stack.some(layer => layer && layer.handle && layer.handle.name === name));
    }
    async registerRouter() {
        await this.registerMiddleware(this.httpAdapter);
        const prefix = this.config.getGlobalPrefix();
        const basePath = prefix ? shared_utils_1.validatePath(prefix) : '';
        this.routesResolver.resolve(this.httpAdapter, basePath);
    }
    async registerRouterHooks() {
        this.routesResolver.registerNotFoundHandler();
        this.routesResolver.registerExceptionHandler();
    }
    connectMicroservice(options) {
        const { NestMicroservice } = load_package_util_1.loadPackage('@nestjs/microservices', 'NestFactory');
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
    async listen(port, ...args) {
        !this.isInitialized && (await this.init());
        this.httpServer.listen(port, ...args);
        return this.httpServer;
    }
    listenAsync(port, hostname) {
        return new Promise(resolve => {
            const server = this.listen(port, hostname, () => resolve(server));
        });
    }
    async close() {
        this.socketModule && (await this.socketModule.close());
        this.httpServer && this.httpServer.close();
        await Promise.all(iterare_1.default(this.microservices).map(async (microservice) => {
            microservice.setIsTerminated(true);
            await microservice.close();
        }));
        await super.close();
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
    async registerMiddleware(instance) {
        await this.middlewareModule.registerMiddleware(this.middlewareContainer, instance);
    }
    isExpress() {
        const isExpress = !this.httpAdapter.getHttpServer;
        if (isExpress) {
            return isExpress;
        }
        return this.httpAdapter instanceof express_adapter_1.ExpressAdapter;
    }
    listenToPromise(microservice) {
        return new Promise(async (resolve, reject) => {
            await microservice.listen(resolve);
        });
    }
}
exports.NestApplication = NestApplication;
