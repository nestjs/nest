"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_service_1 = require("@nestjs/common/services/logger.service");
const load_package_util_1 = require("@nestjs/common/utils/load-package.util");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const express_adapter_1 = require("./adapters/express-adapter");
const express_factory_1 = require("./adapters/express-factory");
const application_config_1 = require("./application-config");
const constants_1 = require("./constants");
const exceptions_zone_1 = require("./errors/exceptions-zone");
const container_1 = require("./injector/container");
const instance_loader_1 = require("./injector/instance-loader");
const metadata_scanner_1 = require("./metadata-scanner");
const nest_application_1 = require("./nest-application");
const nest_application_context_1 = require("./nest-application-context");
const scanner_1 = require("./scanner");
class NestFactoryStatic {
    constructor() {
        this.logger = new logger_service_1.Logger('NestFactory', true);
    }
    async create(module, serverOrOptions, options) {
        const isHttpServer = serverOrOptions && serverOrOptions.patch;
        // tslint:disable-next-line:prefer-const
        let [httpServer, appOptions] = isHttpServer
            ? [serverOrOptions, options]
            : [express_factory_1.ExpressFactory.create(), serverOrOptions];
        const applicationConfig = new application_config_1.ApplicationConfig();
        const container = new container_1.NestContainer(applicationConfig);
        httpServer = this.applyExpressAdapter(httpServer);
        this.applyLogger(appOptions);
        await this.initialize(module, container, applicationConfig, httpServer);
        return this.createNestInstance(new nest_application_1.NestApplication(container, httpServer, applicationConfig, appOptions));
    }
    /**
     * Creates an instance of the NestMicroservice
     *
     * @param  {} module Entry (root) application module class
     * @param  {NestMicroserviceOptions & MicroserviceOptions} options Optional microservice configuration
     * @returns {Promise}
     */
    async createMicroservice(module, options) {
        const { NestMicroservice } = load_package_util_1.loadPackage('@nestjs/microservices', 'NestFactory');
        const applicationConfig = new application_config_1.ApplicationConfig();
        const container = new container_1.NestContainer(applicationConfig);
        this.applyLogger(options);
        await this.initialize(module, container, applicationConfig);
        return this.createNestInstance(new NestMicroservice(container, options, applicationConfig));
    }
    /**
     * Creates an instance of the NestApplicationContext
     *
     * @param  {} module Entry (root) application module class
     * @param  {NestApplicationContextOptions} options Optional Nest application configuration
     * @returns {Promise}
     */
    async createApplicationContext(module, options) {
        const container = new container_1.NestContainer();
        this.applyLogger(options);
        await this.initialize(module, container);
        const modules = container.getModules().values();
        const root = modules.next().value;
        const context = this.createNestInstance(new nest_application_context_1.NestApplicationContext(container, [], root));
        return await context.init();
    }
    createNestInstance(instance) {
        return this.createProxy(instance);
    }
    async initialize(module, container, config = new application_config_1.ApplicationConfig(), httpServer = null) {
        const instanceLoader = new instance_loader_1.InstanceLoader(container);
        const dependenciesScanner = new scanner_1.DependenciesScanner(container, new metadata_scanner_1.MetadataScanner(), config);
        container.setApplicationRef(httpServer);
        try {
            this.logger.log(constants_1.messages.APPLICATION_START);
            await exceptions_zone_1.ExceptionsZone.asyncRun(async () => {
                await dependenciesScanner.scan(module);
                await instanceLoader.createInstancesOfDependencies();
                dependenciesScanner.applyApplicationProviders();
            });
        }
        catch (e) {
            process.abort();
        }
    }
    createProxy(target) {
        const proxy = this.createExceptionProxy();
        return new Proxy(target, {
            get: proxy,
            set: proxy,
        });
    }
    createExceptionProxy() {
        return (receiver, prop) => {
            if (!(prop in receiver))
                return;
            if (shared_utils_1.isFunction(receiver[prop])) {
                return (...args) => {
                    let result;
                    exceptions_zone_1.ExceptionsZone.run(() => {
                        result = receiver[prop](...args);
                    });
                    return result;
                };
            }
            return receiver[prop];
        };
    }
    applyLogger(options) {
        if (!options) {
            return;
        }
        !shared_utils_1.isNil(options.logger) && logger_service_1.Logger.overrideLogger(options.logger);
    }
    applyExpressAdapter(httpAdapter) {
        const isAdapter = httpAdapter.getHttpServer;
        if (isAdapter) {
            return httpAdapter;
        }
        return new express_adapter_1.ExpressAdapter(httpAdapter);
    }
}
exports.NestFactoryStatic = NestFactoryStatic;
exports.NestFactory = new NestFactoryStatic();
