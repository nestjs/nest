import {
  CanActivate,
  ExceptionFilter,
  PipeTransform,
  WebSocketAdapter,
  NestRouterRenderInterceptor,
} from '@nestjs/common';
import {
  AnyNestInterceptor,
  NestInterceptorType,
} from '@nestjs/common/interfaces';
import { InstanceWrapper } from './injector/instance-wrapper';

export class ApplicationConfig {
  private globalPrefix = '';
  private globalPipes: PipeTransform[] = [];
  private globalFilters: ExceptionFilter[] = [];
  private globalInterceptors: AnyNestInterceptor[] = [];
  private globalGuards: CanActivate[] = [];
  private readonly globalRequestPipes: InstanceWrapper<PipeTransform>[] = [];
  private readonly globalRequestFilters: InstanceWrapper<
    ExceptionFilter
  >[] = [];
  private readonly globalRequestInterceptors: InstanceWrapper<
    AnyNestInterceptor
  >[] = [];
  private readonly globalRequestGuards: InstanceWrapper<CanActivate>[] = [];

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

  public getGlobalInterceptors(): AnyNestInterceptor[] {
    return this.globalInterceptors;
  }

  public addGlobalInterceptor(interceptor: AnyNestInterceptor) {
    this.globalInterceptors.push(interceptor);
  }

  public useGlobalInterceptors(...interceptors: NestInterceptorType[]) {
    this.globalInterceptors = this.globalInterceptors.concat(interceptors);
  }
  public useGlobalRouterRenderInterceptors(
    ...interceptors: NestRouterRenderInterceptor[]
  ) {
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

  public addGlobalRequestInterceptor(
    wrapper: InstanceWrapper<AnyNestInterceptor>,
  ) {
    this.globalRequestInterceptors.push(wrapper);
  }

  public getGlobalRequestInterceptors(): InstanceWrapper<AnyNestInterceptor>[] {
    return this.globalRequestInterceptors;
  }

  public addGlobalRequestPipe(wrapper: InstanceWrapper<PipeTransform>) {
    this.globalRequestPipes.push(wrapper);
  }

  public getGlobalRequestPipes(): InstanceWrapper<PipeTransform>[] {
    return this.globalRequestPipes;
  }

  public addGlobalRequestFilter(wrapper: InstanceWrapper<ExceptionFilter>) {
    this.globalRequestFilters.push(wrapper);
  }

  public getGlobalRequestFilters(): InstanceWrapper<ExceptionFilter>[] {
    return this.globalRequestFilters;
  }

  public addGlobalRequestGuard(wrapper: InstanceWrapper<CanActivate>) {
    this.globalRequestGuards.push(wrapper);
  }

  public getGlobalRequestGuards(): InstanceWrapper<CanActivate>[] {
    return this.globalRequestGuards;
  }
}
