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
const scanner_1 = require("./scanner");
const instance_loader_1 = require("./injector/instance-loader");
const container_1 = require("./injector/container");
const exceptions_zone_1 = require("./errors/exceptions-zone");
const logger_service_1 = require("@nestjs/common/services/logger.service");
const constants_1 = require("./constants");
const nest_application_1 = require("./nest-application");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const express_factory_1 = require("./adapters/express-factory");
const metadata_scanner_1 = require("./metadata-scanner");
const microservices_package_not_found_exception_1 = require("./errors/exceptions/microservices-package-not-found.exception");
const nest_application_context_1 = require("./nest-application-context");
const application_config_1 = require("./application-config");
const express_adapter_1 = require("./adapters/express-adapter");
const { NestMicroservice } = optional('@nestjs/microservices/nest-microservice') || {};
class NestFactoryStatic {
    constructor() {
        this.logger = new logger_service_1.Logger('NestFactory', true);
    }
    create(module, serverOrOptions, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const isHttpServer = serverOrOptions && serverOrOptions.patch;
            let [httpServer, appOptions] = isHttpServer
                ? [serverOrOptions, options]
                : [express_factory_1.ExpressFactory.create(), serverOrOptions];
            const applicationConfig = new application_config_1.ApplicationConfig();
            const container = new container_1.NestContainer(applicationConfig);
            httpServer = this.applyExpressAdapter(httpServer);
            this.applyLogger(appOptions);
            yield this.initialize(module, container, applicationConfig, httpServer);
            return this.createNestInstance(new nest_application_1.NestApplication(container, httpServer, applicationConfig, appOptions));
        });
    }
    /**
     * Creates an instance of the NestMicroservice (returns Promise)
     *
     * @param  {} module Entry (root) application module class
     * @param  {NestMicroserviceOptions} options Optional microservice configuration
     * @returns an `Promise` of the INestMicroservice instance
     */
    createMicroservice(module, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!NestMicroservice) {
                throw new microservices_package_not_found_exception_1.MicroservicesPackageNotFoundException();
            }
            const applicationConfig = new application_config_1.ApplicationConfig();
            const container = new container_1.NestContainer(applicationConfig);
            this.applyLogger(options);
            yield this.initialize(module, container, applicationConfig);
            return this.createNestInstance(new NestMicroservice(container, options, applicationConfig));
        });
    }
    /**
     * Creates an instance of the NestApplicationContext (returns Promise)
     *
     * @param  {} module Entry (root) application module class
     * @param  {NestApplicationContextOptions} options Optional Nest application configuration
     * @returns an `Promise` of the INestApplicationContext instance
     */
    createApplicationContext(module, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const container = new container_1.NestContainer();
            this.applyLogger(options);
            yield this.initialize(module, container);
            const modules = container.getModules().values();
            const root = modules.next().value;
            return this.createNestInstance(new nest_application_context_1.NestApplicationContext(container, [], root));
        });
    }
    createNestInstance(instance) {
        return this.createProxy(instance);
    }
    initialize(module, container, config = new application_config_1.ApplicationConfig(), httpServer = null) {
        return __awaiter(this, void 0, void 0, function* () {
            const instanceLoader = new instance_loader_1.InstanceLoader(container);
            const dependenciesScanner = new scanner_1.DependenciesScanner(container, new metadata_scanner_1.MetadataScanner(), config);
            container.setApplicationRef(httpServer);
            try {
                this.logger.log(constants_1.messages.APPLICATION_START);
                yield exceptions_zone_1.ExceptionsZone.asyncRun(() => __awaiter(this, void 0, void 0, function* () {
                    dependenciesScanner.scan(module);
                    yield instanceLoader.createInstancesOfDependencies();
                    dependenciesScanner.applyApplicationProviders();
                }));
            }
            catch (e) {
                process.abort();
            }
        });
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
        if (!options || !options.logger) {
            return;
        }
        logger_service_1.Logger.overrideLogger(options.logger);
    }
    applyExpressAdapter(httpAdapter) {
        const isAdapter = !!httpAdapter.getHttpServer;
        if (isAdapter) {
            return httpAdapter;
        }
        return new express_adapter_1.ExpressAdapter(httpAdapter);
    }
}
exports.NestFactoryStatic = NestFactoryStatic;
exports.NestFactory = new NestFactoryStatic();
