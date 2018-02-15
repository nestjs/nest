import * as optional from 'optional';
import { DependenciesScanner } from './scanner';
import { InstanceLoader } from './injector/instance-loader';
import { NestContainer } from './injector/container';
import { ExceptionsZone } from './errors/exceptions-zone';
import { NestModuleMetatype } from '@nestjs/common/interfaces/modules/module-metatype.interface';
import { Logger } from '@nestjs/common/services/logger.service';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { messages } from './constants';
import { NestApplication } from './nest-application';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { MicroserviceConfiguration } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';
import { ExpressAdapter } from './adapters/express-adapter';
import {
  INestApplication,
  INestMicroservice,
  INestApplicationContext,
} from '@nestjs/common';
import { MetadataScanner } from './metadata-scanner';
import { MicroservicesPackageNotFoundException } from './errors/exceptions/microservices-package-not-found.exception';
import { NestApplicationContext } from './nest-application-context';
import { HttpsOptions } from '@nestjs/common/interfaces/https-options.interface';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';
import { NestMicroserviceOptions } from '@nestjs/common/interfaces/microservices/nest-microservice-options.interface';
import { ApplicationConfig } from './application-config';

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
    expressOrOptions?: any | NestApplicationOptions,
    options?: NestApplicationOptions,
  ): Promise<INestApplication> {
    const isExpressInstance = expressOrOptions && expressOrOptions.response;
    const [expressInstance, appOptions] = isExpressInstance
      ? [expressOrOptions, options]
      : [ExpressAdapter.create(), expressOrOptions];

    const container = new NestContainer();
    const applicationConfig = new ApplicationConfig();

    this.applyLogger(appOptions);
    await this.initialize(module, container, applicationConfig, expressInstance);
    return this.createNestInstance<NestApplication>(
      new NestApplication(
        container,
        expressInstance,
        applicationConfig,
        appOptions,
      ),
    );
  }

  /**
   * Creates an instance of the NestMicroservice (returns Promise)
   *
   * @param  {} module Entry (root) application module class
   * @param  {NestMicroserviceOptions} options Optional microservice configuration
   * @returns an `Promise` of the INestMicroservice instance
   */
  public async createMicroservice(
    module,
    options?: NestMicroserviceOptions,
  ): Promise<INestMicroservice> {
    if (!NestMicroservice) {
      throw new MicroservicesPackageNotFoundException();
    }
    const container = new NestContainer();
    const applicationConfig = new ApplicationConfig();

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
    express = null,
  ) {
    const instanceLoader = new InstanceLoader(container);
    const dependenciesScanner = new DependenciesScanner(
      container,
      new MetadataScanner(),
      config,
    );
    container.setApplicationRef(express);
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
}

export const NestFactory = new NestFactoryStatic();
