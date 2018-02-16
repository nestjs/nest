import { MicroserviceConfiguration } from './microservice-configuration.interface';
import { LoggerService } from '../../services/logger.service';
import { NestApplicationContextOptions } from '../nest-application-context-options.interface';

export interface NestMicroserviceOptions
  extends MicroserviceConfiguration,
    NestApplicationContextOptions {}
