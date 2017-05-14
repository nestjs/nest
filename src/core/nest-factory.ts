import { DependenciesScanner } from './scanner';
import { InstanceLoader } from './injector/instance-loader';
import { NestContainer } from './injector/container';
import { ExceptionsZone } from './errors/exceptions-zone';
import { NestModuleMetatype } from '@nestjs/common/interfaces/modules/module-metatype.interface';
import { Logger } from '@nestjs/common/services/logger.service';
import { messages } from './constants';
import { NestApplication } from './nest-application';
import { NestMicroservice } from './nest-microservice';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { MicroserviceConfiguration } from '@nestjs/microservices/interfaces/microservice-configuration.interface';
import { ExpressAdapter } from './adapters/express-adapter';
import { INestApplication, INestMicroservice } from '@nestjs/common';

export class NestFactory {
    private static container = new NestContainer();
    private static dependenciesScanner = new DependenciesScanner(NestFactory.container);
    private static instanceLoader = new InstanceLoader(NestFactory.container);
    private static logger = new Logger(NestFactory.name);

    public static create(
        module: NestModuleMetatype,
        express = ExpressAdapter.create()): INestApplication {

        this.initialize(module);
        return this.createNestInstance<NestApplication>(
            new NestApplication(this.container, express),
        );
    }

    public static createMicroservice(module: NestModuleMetatype, config?: MicroserviceConfiguration): INestMicroservice {
        this.initialize(module);
        return this.createNestInstance<NestMicroservice>(
            new NestMicroservice(this.container, config),
        );
    }

    private static createNestInstance<T>(instance: T) {
        const proxy = this.createProxy(instance);
        proxy.setupModules();
        return proxy;
    }

    private static initialize(module: NestModuleMetatype) {
        this.logger.log(messages.APPLICATION_START);
        ExceptionsZone.run(() => {
            this.dependenciesScanner.scan(module);
            this.instanceLoader.createInstancesOfDependencies();
        });
    }

    private static createProxy(target) {
        const proxy = this.createExceptionProxy();
        return new Proxy(target, {
            get: proxy,
            set: proxy,
        });
    }

    private static createExceptionProxy() {
        return (receiver, prop) => {
            if (!(prop in receiver))
                return;

            if (isFunction(receiver[prop])) {
                return (...args) => ExceptionsZone.run(() => {
                    receiver[prop](...args);
                });
            }
            return receiver[prop];
        };
    }

}
