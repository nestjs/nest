import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { INestApplication, INestMicroservice, INestApplicationContext, HttpServer } from '@nestjs/common';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';
import { NestMicroserviceOptions } from '@nestjs/common/interfaces/microservices/nest-microservice-options.interface';
import { INestExpressApplication } from '@nestjs/common/interfaces/nest-express-application.interface';
import { FastifyAdapter } from './adapters/fastify-adapter';
import { INestFastifyApplication } from '@nestjs/common/interfaces/nest-fastify-application.interface';
export declare class NestFactoryStatic {
    private readonly logger;
    /**
     * Creates an instance of the NestApplication (returns Promise)
     * @returns an `Promise` of the INestApplication instance
     */
    create(module: any): Promise<INestApplication & INestExpressApplication>;
    create(module: any, options: NestApplicationOptions): Promise<INestApplication & INestExpressApplication>;
    create(module: any, httpServer: HttpServer | any, options?: NestApplicationOptions): Promise<INestApplication & INestExpressApplication>;
    create(module: any, httpServer: FastifyAdapter, options?: NestApplicationOptions): Promise<INestApplication & INestFastifyApplication>;
    /**
     * Creates an instance of the NestMicroservice (returns Promise)
     *
     * @param  {} module Entry (root) application module class
     * @param  {NestMicroserviceOptions} options Optional microservice configuration
     * @returns an `Promise` of the INestMicroservice instance
     */
    createMicroservice(module: any, options?: NestMicroserviceOptions): Promise<INestMicroservice>;
    /**
     * Creates an instance of the NestApplicationContext (returns Promise)
     *
     * @param  {} module Entry (root) application module class
     * @param  {NestApplicationContextOptions} options Optional Nest application configuration
     * @returns an `Promise` of the INestApplicationContext instance
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
