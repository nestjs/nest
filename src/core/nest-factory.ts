import { MicroserviceConfiguration } from '@nestjs/microservices/interfaces/microservice-configuration.interface';
import { ExpressAdapter } from './adapters/express-adapter';
import { messages } from './constants';
import { ExceptionsZone } from './errors/exceptions-zone';
import { NestContainer } from './injector/container';
import { InstanceLoader } from './injector/instance-loader';
import { NestModuleMetatype } from './interfaces/modules/module-metatype.interface';
import { INestApplication } from './interfaces/nest-application.interface';
import { INestMicroservice } from './interfaces/nest-microservice.interface';
import { MetadataScanner } from './metadata-scanner';
import { NestApplication } from './nest-application';
import { NestMicroservice } from './nest-microservice';
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
            new NestApplication(this.container, express),
        );
    }

    /**
     * Creates an instance of the NestMicroservice (returns Promise)
     *
     * @param  {} module Entry ApplicationModule class
     * @param  {MicroserviceConfiguration} config Optional microservice configuration
     * @returns an `Promise` of the INestMicroservice instance
     */
    public async createMicroservice(
        module,
        config?: MicroserviceConfiguration): Promise<INestMicroservice> {

        await this.initialize(module);
        return this.createNestInstance<NestMicroservice>(
            new NestMicroservice(this.container, config),
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

