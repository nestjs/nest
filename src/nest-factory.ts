import { DependenciesScanner } from './core/scanner';
import { InstanceLoader } from './core/injector/instance-loader';
import { NestContainer } from './core/injector/container';
import { ExceptionsZone } from './errors/exceptions-zone';
import { NestModuleMetatype } from './common/interfaces/module-metatype.interface';
import { Logger } from './common/services/logger.service';
import { messages } from './core/constants';
import { NestApplication } from './nest-application';
import { NestMicroservice } from './nest-microservice';
import { isFunction } from './common/utils/shared.utils';
import { MicroserviceConfiguration } from './microservices/interfaces/microservice-configuration.interface';
import { ExpressAdapter } from './core/adapters/express-adapter';
import { INestApplication, INestMicroservice } from './common/interfaces';

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
