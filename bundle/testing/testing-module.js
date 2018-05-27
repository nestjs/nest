"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const express_adapter_1 = require("@nestjs/core/adapters/express-adapter");
const express_factory_1 = require("@nestjs/core/adapters/express-factory");
const microservices_package_not_found_exception_1 = require("@nestjs/core/errors/exceptions/microservices-package-not-found.exception");
const optional = require("optional");
const { NestMicroservice } = optional('@nestjs/microservices/nest-microservice') || {};
class TestingModule extends core_1.NestApplicationContext {
    constructor(container, scope, contextModule, applicationConfig) {
        super(container, scope, contextModule);
        this.applicationConfig = applicationConfig;
    }
    createNestApplication(httpServer = express_factory_1.ExpressFactory.create(), options) {
        httpServer = this.applyExpressAdapter(httpServer);
        this.applyLogger(options);
        this.container.setApplicationRef(httpServer);
        return new core_1.NestApplication(this.container, httpServer, this.applicationConfig, options);
    }
    createNestMicroservice(options) {
        if (!NestMicroservice) {
            throw new microservices_package_not_found_exception_1.MicroservicesPackageNotFoundException();
        }
        this.applyLogger(options);
        return new NestMicroservice(this.container, options, this.applicationConfig);
    }
    applyExpressAdapter(httpAdapter) {
        const isAdapter = httpAdapter.getHttpServer;
        if (isAdapter) {
            return httpAdapter;
        }
        return new express_adapter_1.ExpressAdapter(httpAdapter);
    }
    applyLogger(options) {
        if (!options || !options.logger) {
            return undefined;
        }
        common_1.Logger.overrideLogger(options.logger);
    }
}
exports.TestingModule = TestingModule;
