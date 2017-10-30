import { ExpressAdapter } from './adapters/express-adapter';
import { messages, allowedModules } from './constants';
import { ExceptionsZone } from './errors/exceptions-zone';
import { NestContainer } from './injector/container';
import { InstanceLoader } from './injector/instance-loader';
import { NestModuleMetatype } from './interfaces/modules/module-metatype.interface';
import { INestApplication } from './interfaces/nest-application.interface';
import { INestMicroservice } from './interfaces/nest-microservice.interface';
import { INewable } from './interfaces/newable.interface';
import { MetadataScanner } from './metadata-scanner';
import { NestApplication } from './nest-application';
import { DependenciesScanner } from './scanner';
import { Logger } from './services/logger.service';
import { isFunction } from './utils/shared.utils';


export class NestFactoryStatic {
    private container = new NestContainer();
    private instanceLoader = new InstanceLoader(this.container);
    private logger = new Logger('NestFactory', true);
    private dependenciesScanner = new DependenciesScanner(
        this.container, new MetadataScanner(),
    );
    private modules = {
        SocketModule: null,
        MicroservicesModule: null,
    };

    /**
     * Creates an instance of the NestApplication (returns Promise)
     *
     * @param  {} module Entry ApplicationModule class
     * @param  {} express Optional express() server instance
     * @returns an `Promise` of the INestApplication instance
     */
    public async create(module, express = ExpressAdapter.create()): Promise<INestApplication> {
        await this.initialize(module);
        return this.createNestInstance<NestApplication>(
            new NestApplication(this.container, express, this.modules),
        );
    }

    /**
     * Add a module to your NestFactory. You can add MicroservicesModule and/or SocketsModule
     * @param module The module to add to the NestFactory
     */
    public add<T>(module: T) {
        if (!module.constructor && module.constructor.name) {
            if (allowedModules.indexOf(module.constructor.name) > -1) {
                this.modules[module.constructor.name] = module;
            } else {
                throw new Error(`ERROR! ${module.constructor.name} is not a module that can be consumed by NestFactory.add(). This could be because you attempted to import a module with a importAs syntax; this is not supported. Please refactor your code.`);
            }
        } else {
            throw new Error(`ERROR! Attempted to add ${typeof module} to NestFactory.add().`);
        }
        return this;
    }

    /**
     * Creates an instance of the NestMicroservice (returns Promise)
     *
     * @param  {} module Entry ApplicationModule class
     * @param  {MicroserviceConfiguration} config Optional microservice configuration
     * @returns an `Promise` of the INestMicroservice instance
     */
    public async createMicroservice<T>(
        module,
        config: T,
        microserviceInstantiator: INewable): Promise<INestMicroservice> {

        await this.initialize(module);
        return this.createNestInstance<INestMicroservice>(
            new microserviceInstantiator(this.container, config),
        );
    }

    private createNestInstance<T>(instance: T) {
        return this.createProxy(instance);
    }

    private async initialize(module) {
        try {
            this.logger.log(messages.APPLICATION_START);
            await ExceptionsZone.asyncRun(async () => {
                this.dependenciesScanner.scan(module);
                await this.instanceLoader.createInstancesOfDependencies();
            });
        }
        catch (e) {
            process.abort();
        }
    }

    private createProxy(target) {
        const proxy = this.createExceptionProxy();
        return new Proxy(target, {
            get: proxy,
            set: proxy,
        });
    }

    private createExceptionProxy() {
        return (receiver, prop) => {
            if (!(prop in receiver))
                return;

            if (isFunction(receiver[prop])) {
                return (...args) => {
                    let result;
                    ExceptionsZone.run(() => {
                        result = receiver[prop](...args);
                    });
                    return result;
                };
            }
            return receiver[prop];
        };
    }
}

export const NestFactory = new NestFactoryStatic();
