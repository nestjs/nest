import {
  CanActivate,
  ExceptionFilter,
  NestInterceptor,
  PipeTransform,
  WebSocketAdapter
} from '@nestjs/common';
import {
  ConfigurationProvider
} from '@nestjs/common/interfaces/configuration-provider.interface';
import * as optional from 'optional';

export class ApplicationConfig implements ConfigurationProvider {
  private globalPipes: PipeTransform<any>[] = [];
  private globalFilters: ExceptionFilter[] = [];
  private globalInterceptors: NestInterceptor[] = [];
  private globalGuards: CanActivate[] = [];
  private globalPrefix = '';

  constructor(private ioAdapter: WebSocketAdapter|null = null) {}

  public setGlobalPrefix(prefix: string) { this.globalPrefix = prefix; }

  public getGlobalPrefix() { return this.globalPrefix; }

  public setIoAdapter(ioAdapter: WebSocketAdapter) {
    this.ioAdapter = ioAdapter;
  }

  public getIoAdapter(): WebSocketAdapter { return this.ioAdapter; }

  public useGlobalPipes(...pipes: PipeTransform<any>[]) {
    this.globalPipes = pipes;
  }

  public getGlobalFilters(): ExceptionFilter[] { return this.globalFilters; }

  public useGlobalFilters(...filters: ExceptionFilter[]) {
    this.globalFilters = filters;
  }

  public getGlobalPipes(): PipeTransform<any>[] { return this.globalPipes; }

  public getGlobalInterceptors(): NestInterceptor[] {
    return this.globalInterceptors;
  }

  public useGlobalInterceptors(...interceptors: NestInterceptor[]) {
    this.globalInterceptors = interceptors;
  }

  public getGlobalGuards(): CanActivate[] { return this.globalGuards; }

  public useGlobalGuards(...guards: CanActivate[]) {
    this.globalGuards = guards;
  }
}