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

export class NestFactory {
    private static container = new NestContainer();
    private static dependenciesScanner = new DependenciesScanner(NestFactory.container);
    private static instanceLoader = new InstanceLoader(NestFactory.container);
    private static logger = new Logger(NestFactory.name);

    static create(
        module: NestModuleMetatype,
        express = ExpressAdapter.create()): NestApplication {

        this.initialize(module);
        return this.createNestInstance<NestApplication>(
            new NestApplication(this.container, express)
        );
    }

    static createMicroservice(module: NestModuleMetatype, config?: MicroserviceConfiguration): NestMicroservice {
        this.initialize(module);
        return this.createNestInstance<NestMicroservice>(
            new NestMicroservice(this.container, config)
        );
    }

    private static createNestInstance<T>(instance: T) {
        const proxy = this.createProxy(instance);
        proxy.setupModules();
        return proxy;
    }

    private static initialize(module: NestModuleMetatype) {
        ExceptionsZone.run(() => {
            this.logger.log(messages.APPLICATION_START);
            this.dependenciesScanner.scan(module);
            this.instanceLoader.createInstancesOfDependencies();
        });
    }

    private static createProxy(target) {
        return new Proxy(target, {
            get: this.createExceptionMethodProxy(),
            set: this.createExceptionMethodProxy()
        });
    }

    private static createExceptionMethodProxy() {
        return (receiver, prop) => {
            if (!(prop in receiver)) { return undefined; }

            if (isFunction(receiver[prop])) {
                return (...args) => ExceptionsZone.run(() => {
                    receiver[prop](...args);
                });
            }
            return receiver[prop];
        }
    }

}
