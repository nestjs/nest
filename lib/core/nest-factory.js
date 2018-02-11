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
const express_adapter_1 = require("./adapters/express-adapter");
const metadata_scanner_1 = require("./metadata-scanner");
const microservices_package_not_found_exception_1 = require("./errors/exceptions/microservices-package-not-found.exception");
const nest_application_context_1 = require("./nest-application-context");
const { NestMicroservice } = optional('@nestjs/microservices/nest-microservice') || {};
class NestFactoryStatic {
    constructor() {
        this.container = new container_1.NestContainer();
        this.instanceLoader = new instance_loader_1.InstanceLoader(this.container);
        this.logger = new logger_service_1.Logger('NestFactory', true);
        this.dependenciesScanner = new scanner_1.DependenciesScanner(this.container, new metadata_scanner_1.MetadataScanner());
    }
    /**
     * Creates an instance of the NestApplication (returns Promise)
     *
     * @param  {} module Entry (root) application module class
     * @param  {} express Optional express() server instance
     * @returns an `Promise` of the INestApplication instance
     */
    create(module, express = express_adapter_1.ExpressAdapter.create(), httpsOptions = null) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initialize(module, express);
            return this.createNestInstance(new nest_application_1.NestApplication(this.container, express, httpsOptions));
        });
    }
    /**
     * Creates an instance of the NestMicroservice (returns Promise)
     *
     * @param  {} module Entry (root) application module class
     * @param  {MicroserviceConfiguration} config Optional microservice configuration
     * @returns an `Promise` of the INestMicroservice instance
     */
    createMicroservice(module, config) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!NestMicroservice) {
                throw new microservices_package_not_found_exception_1.MicroservicesPackageNotFoundException();
            }
            yield this.initialize(module);
            return this.createNestInstance(new NestMicroservice(this.container, config));
        });
    }
    /**
     * Creates an instance of the NestApplicationContext (returns Promise)
     *
     * @param  {} module Entry (root) application module class
     * @returns an `Promise` of the INestApplicationContext instance
     */
    createApplicationContext(module) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initialize(module);
            const modules = this.container.getModules().values();
            const root = modules.next().value;
            return this.createNestInstance(new nest_application_context_1.NestApplicationContext(this.container, [], root));
        });
    }
    createNestInstance(instance) {
        return this.createProxy(instance);
    }
    initialize(module, express = null) {
        return __awaiter(this, void 0, void 0, function* () {
            this.container.setApplicationRef(express);
            try {
                this.logger.log(constants_1.messages.APPLICATION_START);
                yield exceptions_zone_1.ExceptionsZone.asyncRun(() => __awaiter(this, void 0, void 0, function* () {
                    this.dependenciesScanner.scan(module);
                    yield this.instanceLoader.createInstancesOfDependencies();
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
}
exports.NestFactoryStatic = NestFactoryStatic;
exports.NestFactory = new NestFactoryStatic();
