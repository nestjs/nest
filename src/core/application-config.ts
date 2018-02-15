import * as optional from 'optional';
import {
  PipeTransform,
  WebSocketAdapter,
  ExceptionFilter,
  NestInterceptor,
  CanActivate,
} from '@nestjs/common';
import { ConfigurationProvider } from '@nestjs/common/interfaces/configuration-provider.interface';

export class ApplicationConfig implements ConfigurationProvider {
  private globalPipes: PipeTransform<any>[] = [];
  private globalFilters: ExceptionFilter[] = [];
  private globalInterceptors: NestInterceptor[] = [];
  private globalGuards: CanActivate[] = [];
  private globalPrefix = '';

  constructor(private ioAdapter: WebSocketAdapter | null = null) {}

  public setGlobalPrefix(prefix: string) {
    this.globalPrefix = prefix;
  }

  public getGlobalPrefix() {
    return this.globalPrefix;
  }

  public setIoAdapter(ioAdapter: WebSocketAdapter) {
    this.ioAdapter = ioAdapter;
  }

  public getIoAdapter(): WebSocketAdapter {
    return this.ioAdapter;
  }

  public addGlobalPipe(pipe: PipeTransform<any>) {
    this.globalPipes.push(pipe);
  }
  
  public useGlobalPipes(...pipes: PipeTransform<any>[]) {
    this.globalPipes = this.globalPipes.concat(pipes);
  }

  public getGlobalFilters(): ExceptionFilter[] {
    return this.globalFilters;
  }

  public addGlobalFilter(filter: ExceptionFilter) {
    this.globalFilters.push(filter);
  }

  public useGlobalFilters(...filters: ExceptionFilter[]) {
    this.globalFilters = this.globalFilters.concat(filters);
  }

  public getGlobalPipes(): PipeTransform<any>[] {
    return this.globalPipes;
  }

  public getGlobalInterceptors(): NestInterceptor[] {
    return this.globalInterceptors;
  }

  public addGlobalInterceptor(interceptor: NestInterceptor) {
    this.globalInterceptors.push(interceptor);
  }

  public useGlobalInterceptors(...interceptors: NestInterceptor[]) {
    this.globalInterceptors = this.globalInterceptors.concat(interceptors);
  }

  public getGlobalGuards(): CanActivate[] {
    return this.globalGuards;
  }

  public addGlobalGuard(guard: CanActivate) {
    this.globalGuards.push(guard);
  }

  public useGlobalGuards(...guards: CanActivate[]) {
    this.globalGuards = this.globalGuards.concat(guards);
  }
}
