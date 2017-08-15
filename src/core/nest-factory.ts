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
import { MetadataScanner } from './metadata-scanner';

export class NestFactoryStatic {
    private container = new NestContainer();
    private instanceLoader = new InstanceLoader(this.container);
    private logger = new Logger('NestFactory');
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

