import { NestMicroservice } from './nest-microservice';
import { NestApplication, NestFactory } from '@nestjs/core';
import { MicroserviceConfiguration } from './interfaces/microservice-configuration.interface';


export class MicroservicesFactory {

    public async createMicroservice(
        module,
        config: MicroserviceConfiguration,
    ) {
        NestFactory.createMicroservice<MicroserviceConfiguration>(module, config, NestMicroservice);
    }

}
