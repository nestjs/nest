import { MicroserviceConfiguration } from './microservice-configuration.interface';
import { NestApplicationContextOptions } from '../nest-application-context-options.interface';
export interface NestMicroserviceOptions extends MicroserviceConfiguration, NestApplicationContextOptions {
}
