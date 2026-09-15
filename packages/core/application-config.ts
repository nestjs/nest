import type {
  CanActivate,
  ExceptionFilter,
  NestInterceptor,
  PipeTransform,
  PreRequestHook,
  RouteConflictPolicy,
  RouteResolutionStrategy,
  VersioningOptions,
  WebSocketAdapter,
} from '@nestjs/common';
import type { GlobalPrefixOptions } from '@nestjs/common/internal';
import { InstanceWrapper } from './injector/instance-wrapper.js';
import { ExcludeRouteMetadata } from './router/interfaces/exclude-route-metadata.interface.js';

export class ApplicationConfig {
  private globalPrefixes: string[] = [];
  private globalPrefixOptions: GlobalPrefixOptions<ExcludeRouteMetadata> = {};
  private globalPipes: Array<PipeTransform> = [];
  private globalFilters: Array<ExceptionFilter> = [];
  private globalInterceptors: Array<NestInterceptor> = [];
  private globalGuards: Array<CanActivate> = [];
  private globalPreRequestHooks: Array<PreRequestHook> = [];
  private versioningOptions: VersioningOptions;
  private routeConflictPolicy: RouteConflictPolicy | undefined;
  private routeResolutionStrategy: RouteResolutionStrategy | undefined;
  private readonly globalRequestPipes: InstanceWrapper<PipeTransform>[] = [];
  private readonly globalRequestFilters: InstanceWrapper<ExceptionFilter>[] =
    [];
  private readonly globalRequestInterceptors: InstanceWrapper<NestInterceptor>[] =
    [];
  private readonly globalRequestGuards: InstanceWrapper<CanActivate>[] = [];

  constructor(private ioAdapter: WebSocketAdapter | null = null) {}

  public setGlobalPrefix(prefix: string | string[]) {
    this.globalPrefixes = Array.isArray(prefix) ? prefix : [prefix];
  }

  /**
   * Returns the first global prefix, or an empty string if none was set.
   *
   * This method predates support for multiple prefixes and keeps its
   * `string` return type on purpose, so that existing consumers (e.g.
   * `@nestjs/swagger`) are not broken. When several prefixes have been set,
   * only the first one is returned; use {@link getGlobalPrefixes} to get all
   * of them.
   *
   * @deprecated Use {@link getGlobalPrefixes} instead. This method will be
   * removed in NestJS v13.
   */
  public getGlobalPrefix(): string {
    // Intentionally returns only the first prefix to preserve the previous
    // `string` contract. See the JSDoc above.
    return this.globalPrefixes[0] ?? '';
  }

  /**
   * Returns every global prefix set via {@link setGlobalPrefix}, in the order
   * they were provided. Returns an empty array if none was set.
   */
  public getGlobalPrefixes(): string[] {
    return this.globalPrefixes;
  }

  public setGlobalPrefixOptions(
    options: GlobalPrefixOptions<ExcludeRouteMetadata>,
  ) {
    this.globalPrefixOptions = options;
  }

  public getGlobalPrefixOptions(): GlobalPrefixOptions<ExcludeRouteMetadata> {
    return this.globalPrefixOptions;
  }

  public setIoAdapter(ioAdapter: WebSocketAdapter) {
    this.ioAdapter = ioAdapter;
  }

  public getIoAdapter(): WebSocketAdapter {
    return this.ioAdapter!;
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

  public addGlobalRequestInterceptor(
    wrapper: InstanceWrapper<NestInterceptor>,
  ) {
    this.globalRequestInterceptors.push(wrapper);
  }

  public getGlobalRequestInterceptors(): InstanceWrapper<NestInterceptor>[] {
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

  public registerPreRequestHook(...hooks: PreRequestHook[]) {
    this.globalPreRequestHooks = this.globalPreRequestHooks.concat(hooks);
  }

  public getGlobalPreRequestHooks(): PreRequestHook[] {
    return this.globalPreRequestHooks;
  }

  public enableVersioning(options: VersioningOptions): void {
    if (Array.isArray(options.defaultVersion)) {
      // Drop duplicated versions
      options.defaultVersion = Array.from(new Set(options.defaultVersion));
    }

    this.versioningOptions = options;
  }

  public getVersioning(): VersioningOptions | undefined {
    return this.versioningOptions;
  }

  public setRouteConflictPolicy(policy: RouteConflictPolicy | undefined): void {
    this.routeConflictPolicy = policy;
  }

  public getRouteConflictPolicy(): RouteConflictPolicy | undefined {
    return this.routeConflictPolicy;
  }

  public setRouteResolutionStrategy(
    strategy: RouteResolutionStrategy | undefined,
  ): void {
    this.routeResolutionStrategy = strategy;
  }

  public getRouteResolutionStrategy(): RouteResolutionStrategy | undefined {
    return this.routeResolutionStrategy;
  }
}
