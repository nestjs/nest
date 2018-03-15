"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const optional = require("optional");
const core_1 = require("@nestjs/core");
const microservices_package_not_found_exception_1 = require("@nestjs/core/errors/exceptions/microservices-package-not-found.exception");
const application_config_1 = require("@nestjs/core/application-config");
const express_factory_1 = require("@nestjs/core/adapters/express-factory");
const express_adapter_1 = require("@nestjs/core/adapters/express-adapter");
const { NestMicroservice } = optional('@nestjs/microservices/nest-microservice') || {};
class TestingModule extends core_1.NestApplicationContext {
    constructor(container, scope, contextModule) {
        super(container, scope, contextModule);
    }
    createNestApplication(httpServer = express_factory_1.ExpressFactory.create()) {
        httpServer = this.applyExpressAdapter(httpServer);
        this.container.setApplicationRef(httpServer);
        return new core_1.NestApplication(this.container, httpServer, new application_config_1.ApplicationConfig());
    }
    createNestMicroservice(config) {
        if (!NestMicroservice) {
            throw new microservices_package_not_found_exception_1.MicroservicesPackageNotFoundException();
        }
        return new NestMicroservice(this.container, config, new application_config_1.ApplicationConfig());
    }
    applyExpressAdapter(httpAdapter) {
        const isAdapter = !!httpAdapter.getHttpServer;
        if (isAdapter) {
            return httpAdapter;
        }
        return new express_adapter_1.ExpressAdapter(httpAdapter);
    }
}
exports.TestingModule = TestingModule;
