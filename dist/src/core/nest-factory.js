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
const scanner_1 = require("./scanner");
const instance_loader_1 = require("./injector/instance-loader");
const container_1 = require("./injector/container");
const exceptions_zone_1 = require("./errors/exceptions-zone");
const logger_service_1 = require("@nestjs/common/services/logger.service");
const constants_1 = require("./constants");
const nest_application_1 = require("./nest-application");
const nest_microservice_1 = require("./nest-microservice");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const express_adapter_1 = require("./adapters/express-adapter");
const metadata_scanner_1 = require("./metadata-scanner");
class NestFactory {
    static create(module, express = express_adapter_1.ExpressAdapter.create()) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initialize(module);
            return this.createNestInstance(new nest_application_1.NestApplication(this.container, express));
        });
    }
    static createMicroservice(module, config) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initialize(module);
            return this.createNestInstance(new nest_microservice_1.NestMicroservice(this.container, config));
        });
    }
    static createNestInstance(instance) {
        return this.createProxy(instance);
    }
    static initialize(module) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.log(constants_1.messages.APPLICATION_START);
            yield exceptions_zone_1.ExceptionsZone.asyncRun(() => __awaiter(this, void 0, void 0, function* () {
                this.dependenciesScanner.scan(module);
                yield this.instanceLoader.createInstancesOfDependencies();
            }));
        });
    }
    static createProxy(target) {
        const proxy = this.createExceptionProxy();
        return new Proxy(target, {
            get: proxy,
            set: proxy,
        });
    }
    static createExceptionProxy() {
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
NestFactory.container = new container_1.NestContainer();
NestFactory.instanceLoader = new instance_loader_1.InstanceLoader(NestFactory.container);
NestFactory.logger = new logger_service_1.Logger(NestFactory.name);
NestFactory.dependenciesScanner = new scanner_1.DependenciesScanner(NestFactory.container, new metadata_scanner_1.MetadataScanner());
exports.NestFactory = NestFactory;
//# sourceMappingURL=nest-factory.js.map