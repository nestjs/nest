import { MicroserviceConfiguration } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';
import {
  INestApplication,
  INestMicroservice,
  INestApplicationContext
} from '@nestjs/common';
export declare class NestFactoryStatic {
  private container;
  private instanceLoader;
  private logger;
  private dependenciesScanner;
  /**
   * Creates an instance of the NestApplication (returns Promise)
   *
   * @param  {} module Entry (root) application module class
   * @param  {} express Optional express() server instance
   * @returns an `Promise` of the INestApplication instance
   */
  create(module: any, express?: any): Promise<INestApplication>;
  /**
   * Creates an instance of the NestMicroservice (returns Promise)
   *
   * @param  {} module Entry (root) application module class
   * @param  {MicroserviceConfiguration} config Optional microservice configuration
   * @returns an `Promise` of the INestMicroservice instance
   */
  createMicroservice(
    module: any,
    config?: MicroserviceConfiguration
  ): Promise<INestMicroservice>;
  /**
   * Creates an instance of the NestApplicationContext (returns Promise)
   *
   * @param  {} module Entry (root) application module class
   * @returns an `Promise` of the INestApplicationContext instance
   */
  createApplicationContext(module: any): Promise<INestApplicationContext>;
  private createNestInstance<T>(instance);
  private initialize(module);
  private createProxy(target);
  private createExceptionProxy();
}
export declare const NestFactory: NestFactoryStatic;
