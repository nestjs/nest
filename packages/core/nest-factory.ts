import * as optional from 'optional';
import { DependenciesScanner } from './scanner';
import { InstanceLoader } from './injector/instance-loader';
import { NestContainer } from './injector/container';
import { ExceptionsZone } from './errors/exceptions-zone';
import { Logger } from '@nestjs/common/services/logger.service';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { messages } from './constants';
import { NestApplication } from './nest-application';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { ExpressFactory } from './adapters/express-factory';
import {
  INestApplication,
  INestMicroservice,
  INestApplicationContext,
  HttpServer,
} from '@nestjs/common';
import { MetadataScanner } from './metadata-scanner';
import { MicroservicesPackageNotFoundException } from './errors/exceptions/microservices-package-not-found.exception';
import { NestApplicationContext } from './nest-application-context';
import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';
import { NestMicroserviceOptions } from '@nestjs/common/interfaces/microservices/nest-microservice-options.interface';
import { ApplicationConfig } from './application-config';
import { ExpressAdapter } from './adapters/express-adapter';
import { INestExpressApplication } from '@nestjs/common/interfaces/nest-express-application.interface';
import { FastifyAdapter } from './adapters/fastify-adapter';
import { INestFastifyApplication } from '@nestjs/common/interfaces/nest-fastify-application.interface';
import { MicroserviceOptions } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';

const { NestMicroservice } =
  optional('@nestjs/microservices/nest-microservice') || ({} as any);

export class NestFactoryStatic {
  private readonly logger = new Logger('NestFactory', true);
  /**
   * Creates an instance of the NestApplication (returns Promise)
   * @returns an `Promise` of the INestApplication instance
   */
  public async create(
    module: any,
  ): Promise<INestApplication & INestExpressApplication>;
  public async create(
    module: any,
    options: NestApplicationOptions,
  ): Promise<INestApplication & INestExpressApplication>;
  public async create(
    module: any,
    httpServer: FastifyAdapter,
    options?: NestApplicationOptions,
  ): Promise<INestApplication & INestFastifyApplication>;
  public async create(
    module: any,
    httpServer: HttpServer,
    options?: NestApplicationOptions,
  ): Promise<INestApplication & INestExpressApplication>;
  public async create(
    module: any,
    serverOrOptions?: any,
    options?: NestApplicationOptions,
  ): Promise<
    INestApplication & (INestExpressApplication | INestFastifyApplication)
  > {
    const isHttpServer = serverOrOptions && serverOrOptions.patch;
    let [httpServer, appOptions] = isHttpServer
      ? [serverOrOptions, options]
      : [ExpressFactory.create(), serverOrOptions];

    const applicationConfig = new ApplicationConfig();
    const container = new NestContainer(applicationConfig);
    httpServer = this.applyExpressAdapter(httpServer);

    this.applyLogger(appOptions);
    await this.initialize(module, container, applicationConfig, httpServer);
    return this.createNestInstance<NestApplication>(
      new NestApplication(container, httpServer, applicationConfig, appOptions),
    );
  }

  /**
   * Creates an instance of the NestMicroservice (returns Promise)
   *
   * @param  {} module Entry (root) application module class
   * @param  {NestMicroserviceOptions & MicroserviceOptions} options Optional microservice configuration
   * @returns an `Promise` of the INestMicroservice instance
   */
  public async createMicroservice(
    module,
    options?: NestMicroserviceOptions & MicroserviceOptions,
  ): Promise<INestMicroservice> {
    if (!NestMicroservice) {
      throw new MicroservicesPackageNotFoundException();
    }
    const applicationConfig = new ApplicationConfig();
    const container = new NestContainer(applicationConfig);

    this.applyLogger(options);
    await this.initialize(module, container, applicationConfig);
    return this.createNestInstance<INestMicroservice>(
      new NestMicroservice(container, options as any, applicationConfig),
    );
  }

  /**
   * Creates an instance of the NestApplicationContext (returns Promise)
   *
   * @param  {} module Entry (root) application module class
   * @param  {NestApplicationContextOptions} options Optional Nest application configuration
   * @returns an `Promise` of the INestApplicationContext instance
   */
  public async createApplicationContext(
    module,
    options?: NestApplicationContextOptions,
  ): Promise<INestApplicationContext> {
    const container = new NestContainer();

    this.applyLogger(options);
    await this.initialize(module, container);

    const modules = container.getModules().values();
    const root = modules.next().value;
    return this.createNestInstance<INestApplicationContext>(
      new NestApplicationContext(container, [], root),
    );
  }

  private createNestInstance<T>(instance: T) {
    return this.createProxy(instance);
  }

  private async initialize(
    module,
    container: NestContainer,
    config = new ApplicationConfig(),
    httpServer: HttpServer = null,
  ) {
    const instanceLoader = new InstanceLoader(container);
    const dependenciesScanner = new DependenciesScanner(
      container,
      new MetadataScanner(),
      config,
    );
    container.setApplicationRef(httpServer);
    try {
      this.logger.log(messages.APPLICATION_START);
      await ExceptionsZone.asyncRun(async () => {
        dependenciesScanner.scan(module);
        await instanceLoader.createInstancesOfDependencies();
        dependenciesScanner.applyApplicationProviders();
      });
    } catch (e) {
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
      if (!(prop in receiver)) return;

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

  private applyLogger(options: NestApplicationContextOptions | undefined) {
    if (!options || !options.logger) {
      return;
    }
    Logger.overrideLogger(options.logger);
  }

  private applyExpressAdapter(httpAdapter: HttpServer): HttpServer {
    const isAdapter = !!httpAdapter.getHttpServer;
    if (isAdapter) {
      return httpAdapter;
    }
    return new ExpressAdapter(httpAdapter);
  }
}

export const NestFactory = new NestFactoryStatic();
