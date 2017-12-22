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
export declare class NestMicroservice implements INestMicroservice {
  private readonly container;
  private readonly logger;
  private readonly microservicesModule;
  private readonly socketModule;
  private readonly microserviceConfig;
  private readonly server;
  private readonly config;
  private isTerminated;
  private isInitialized;
  private isInitHookCalled;
  constructor(container: NestContainer, config?: MicroserviceConfiguration);
  setupModules(): void;
  setupListeners(): void;
  useWebSocketAdapter(adapter: WebSocketAdapter): void;
  useGlobalFilters(...filters: ExceptionFilter[]): void;
  useGlobalPipes(...pipes: PipeTransform<any>[]): void;
  useGlobalInterceptors(...interceptors: NestInterceptor[]): void;
  useGlobalGuards(...guards: CanActivate[]): void;
  listen(callback: () => void): void;
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
