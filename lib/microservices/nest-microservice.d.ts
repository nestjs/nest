import { NestContainer } from '@nestjs/core/injector/container';
import { MicroserviceConfiguration } from './interfaces/microservice-configuration.interface';
import {
  INestMicroservice,
  WebSocketAdapter,
  CanActivate,
  PipeTransform,
  NestInterceptor,
  ExceptionFilter,
} from '@nestjs/common';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { NestApplicationContext } from '@nestjs/core/nest-application-context';
export declare class NestMicroservice extends NestApplicationContext
  implements INestMicroservice {
  private readonly applicationConfig;
  private readonly logger;
  private readonly microservicesModule;
  private readonly socketModule;
  private readonly microserviceConfig;
  private readonly server;
  private isTerminated;
  private isInitialized;
  private isInitHookCalled;
  constructor(
    container: NestContainer,
    config: MicroserviceConfiguration,
    applicationConfig: ApplicationConfig,
  );
  setupModules(): void;
  setupListeners(): void;
  useWebSocketAdapter(adapter: WebSocketAdapter): this;
  useGlobalFilters(...filters: ExceptionFilter[]): this;
  useGlobalPipes(...pipes: PipeTransform<any>[]): this;
  useGlobalInterceptors(...interceptors: NestInterceptor[]): this;
  useGlobalGuards(...guards: CanActivate[]): this;
  listen(callback: () => void): void;
  listenAsync(): Promise<any>;
  close(): void;
  setIsInitialized(isInitialized: boolean): void;
  setIsTerminated(isTerminaed: boolean): void;
  setIsInitHookCalled(isInitHookCalled: boolean): void;
  private closeApplication();
  private callInitHook();
  private callModuleInitHook(module);
  private hasOnModuleInitHook(instance);
  private callDestroyHook();
  private callModuleDestroyHook(module);
  private hasOnModuleDestroyHook(instance);
}
