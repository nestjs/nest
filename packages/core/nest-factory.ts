import {
  HttpServer,
  INestApplication,
  INestApplicationContext,
  INestMicroservice,
} from '@nestjs/common';
import { MicroserviceOptions } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';
import { NestMicroserviceOptions } from '@nestjs/common/interfaces/microservices/nest-microservice-options.interface';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isFunction, isNil } from '@nestjs/common/utils/shared.utils';
import { ApplicationConfig } from './application-config';
import { MESSAGES } from './constants';
import { ExceptionsZone } from './errors/exceptions-zone';
import { loadAdapter } from './helpers/load-adapter';
import { NestContainer } from './injector/container';
import { InstanceLoader } from './injector/instance-loader';
import { MetadataScanner } from './metadata-scanner';
import { NestApplication } from './nest-application';
import { NestApplicationContext } from './nest-application-context';
import { DependenciesScanner } from './scanner';

export class NestFactoryStatic {
  private readonly logger = new Logger('NestFactory', true);
  /**
   * Creates an instance of the NestApplication
   * @returns {Promise}
   */
  public async create<T extends INestApplication = INestApplication>(
    module: any,
    options?: NestApplicationOptions,
  ): Promise<T>;
  public async create<T extends INestApplication = INestApplication>(
    module: any,
    httpServer: HttpServer,
    options?: NestApplicationOptions,
  ): Promise<T>;
  public async create<T extends INestApplication = INestApplication>(
    module: any,
    serverOrOptions?: HttpServer | NestApplicationOptions,
    options?: NestApplicationOptions,
  ): Promise<T> {
    // tslint:disable-next-line:prefer-const
    let [httpServer, appOptions] = this.isHttpServer(serverOrOptions)
      ? [serverOrOptions, options]
      : [this.createHttpAdapter(), serverOrOptions];

    const applicationConfig = new ApplicationConfig();
    const container = new NestContainer(applicationConfig);

    this.applyLogger(appOptions);
    await this.initialize(module, container, applicationConfig, httpServer);

    const instance = new NestApplication(
      container,
      httpServer,
      applicationConfig,
      appOptions,
    );
    const target = this.createNestInstance(instance);
    return this.createAdapterProxy<T>(target, httpServer);
  }

  /**
   * Creates an instance of the NestMicroservice
   *
   * @param  {} module Entry (root) application module class
   * @param  {NestMicroserviceOptions & MicroserviceOptions} options Optional microservice configuration
   * @returns {Promise}
   */
  public async createMicroservice(
    module: any,
    options?: NestMicroserviceOptions & MicroserviceOptions,
  ): Promise<INestMicroservice> {
    const { NestMicroservice } = loadPackage(
      '@nestjs/microservices',
      'NestFactory',
    );

    const applicationConfig = new ApplicationConfig();
    const container = new NestContainer(applicationConfig);

    this.applyLogger(options);
    await this.initialize(module, container, applicationConfig);
    return this.createNestInstance<INestMicroservice>(
      new NestMicroservice(container, options, applicationConfig),
    );
  }

  /**
   * Creates an instance of the NestApplicationContext
   *
   * @param  {} module Entry (root) application module class
   * @param  {NestApplicationContextOptions} options Optional Nest application configuration
   * @returns {Promise}
   */
  public async createApplicationContext(
    module: any,
    options?: NestApplicationContextOptions,
  ): Promise<INestApplicationContext> {
    const container = new NestContainer();

    this.applyLogger(options);
    await this.initialize(module, container);

    const modules = container.getModules().values();
    const root = modules.next().value;
    const context = this.createNestInstance<NestApplicationContext>(
      new NestApplicationContext(container, [], root),
    );
    return context.init();
  }

  private createNestInstance<T>(instance: T): T {
    return this.createProxy(instance);
  }

  private async initialize(
    module: any,
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
      this.logger.log(MESSAGES.APPLICATION_START);
      await ExceptionsZone.asyncRun(async () => {
        await dependenciesScanner.scan(module);
        await instanceLoader.createInstancesOfDependencies();
        dependenciesScanner.applyApplicationProviders();
      });
    } catch (e) {
      process.abort();
    }
  }

  private createProxy(target: any) {
    const proxy = this.createExceptionProxy();
    return new Proxy(target, {
      get: proxy,
      set: proxy,
    });
  }

  private createExceptionProxy() {
    return (receiver: Record<string, any>, prop: string) => {
      if (!(prop in receiver)) {
        return;
      }
      if (isFunction(receiver[prop])) {
        return this.createExceptionZone(receiver, prop);
      }
      return receiver[prop];
    };
  }

  private createExceptionZone(
    receiver: Record<string, any>,
    prop: string,
  ): Function {
    return (...args: unknown[]) => {
      let result;
      ExceptionsZone.run(() => {
        result = receiver[prop](...args);
      });
      return result;
    };
  }

  private applyLogger(options: NestApplicationContextOptions | undefined) {
    if (!options) {
      return;
    }
    !isNil(options.logger) && Logger.overrideLogger(options.logger);
  }

  private createHttpAdapter<T = any>(httpServer?: T): HttpServer {
    const { ExpressAdapter } = loadAdapter('@nestjs/platform-express', 'HTTP');
    return new ExpressAdapter(httpServer);
  }

  private isHttpServer(
    serverOrOptions: HttpServer | NestApplicationOptions,
  ): serverOrOptions is HttpServer {
    return !!(serverOrOptions && (serverOrOptions as HttpServer).patch);
  }

  private createAdapterProxy<T>(app: NestApplication, adapter: HttpServer): T {
    return (new Proxy(app, {
      get: (receiver: Record<string, any>, prop: string) => {
        if (!(prop in receiver) && prop in adapter) {
          return this.createExceptionZone(receiver, prop);
        }
        return receiver[prop];
      },
    }) as unknown) as T;
  }
}

export const NestFactory = new NestFactoryStatic();
