import { HttpServer, INestApplication, INestApplicationContext, INestMicroservice } from '@nestjs/common';
import { MicroserviceOptions } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';
import { NestMicroserviceOptions } from '@nestjs/common/interfaces/microservices/nest-microservice-options.interface';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { INestExpressApplication } from '@nestjs/common/interfaces/nest-express-application.interface';
import { INestFastifyApplication } from '@nestjs/common/interfaces/nest-fastify-application.interface';
import { FastifyAdapter } from './adapters/fastify-adapter';
export declare class NestFactoryStatic {
    private readonly logger;
    /**
     * Creates an instance of the NestApplication
     * @returns {Promise}
     */
    create(module: any, options?: NestApplicationOptions): Promise<INestApplication & INestExpressApplication>;
    create(module: any, httpServer: FastifyAdapter, options?: NestApplicationOptions): Promise<INestApplication & INestFastifyApplication>;
    create(module: any, httpServer: HttpServer | any, options?: NestApplicationOptions): Promise<INestApplication & INestExpressApplication>;
    /**
     * Creates an instance of the NestMicroservice
     *
     * @param  {} module Entry (root) application module class
     * @param  {NestMicroserviceOptions & MicroserviceOptions} options Optional microservice configuration
     * @returns {Promise}
     */
    createMicroservice(module: any, options?: NestMicroserviceOptions & MicroserviceOptions): Promise<INestMicroservice>;
    /**
     * Creates an instance of the NestApplicationContext
     *
     * @param  {} module Entry (root) application module class
     * @param  {NestApplicationContextOptions} options Optional Nest application configuration
     * @returns {Promise}
     */
    createApplicationContext(module: any, options?: NestApplicationContextOptions): Promise<INestApplicationContext>;
    private createNestInstance<T>(instance);
    private initialize(module, container, config?, httpServer?);
    private createProxy(target);
    private createExceptionProxy();
    private applyLogger(options);
    private applyExpressAdapter(httpAdapter);
}
export declare const NestFactory: NestFactoryStatic;
