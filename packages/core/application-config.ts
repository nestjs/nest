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
import {
  assertEnhancer,
  warnOnInvalidFilter,
} from './helpers/assert-enhancer.js';
import type { CookieSigner } from './helpers/cookies/cookie-signer.js';
import { InstanceWrapper } from './injector/instance-wrapper.js';
import { ExcludeRouteMetadata } from './router/interfaces/exclude-route-metadata.interface.js';

export class ApplicationConfig {
  private globalPrefix = '';
  private globalPrefixOptions: GlobalPrefixOptions<ExcludeRouteMetadata> = {};
  private globalPipes: Array<PipeTransform> = [];
  private globalFilters: Array<ExceptionFilter> = [];
  private globalInterceptors: Array<NestInterceptor> = [];
  private globalGuards: Array<CanActivate> = [];
  private globalPreRequestHooks: Array<PreRequestHook> = [];
  private versioningOptions: VersioningOptions;
  private routeConflictPolicy: RouteConflictPolicy | undefined;
  private routeResolutionStrategy: RouteResolutionStrategy | undefined;
  private cookieSigner: CookieSigner | undefined;
  private readonly globalRequestPipes: InstanceWrapper<PipeTransform>[] = [];
  private readonly globalRequestFilters: InstanceWrapper<ExceptionFilter>[] =
    [];
  private readonly globalRequestInterceptors: InstanceWrapper<NestInterceptor>[] =
    [];
  private readonly globalRequestGuards: InstanceWrapper<CanActivate>[] = [];
  /**
   * Module-scoped enhancers (registered via the `MODULE_*` tokens, see
   * #17962). Keyed by the owning module's key; unlike the global lists
   * above, an entry only applies to the controllers of that one module
   * ("shallow" scoping — it does not reach into imported modules).
   */
  private readonly modulePipes = new Map<string, Array<PipeTransform>>();
  private readonly moduleFilters = new Map<string, Array<ExceptionFilter>>();
  private readonly moduleInterceptors = new Map<
    string,
    Array<NestInterceptor>
  >();
  private readonly moduleGuards = new Map<string, Array<CanActivate>>();
  private readonly moduleRequestPipes = new Map<
    string,
    InstanceWrapper<PipeTransform>[]
  >();
  private readonly moduleRequestFilters = new Map<
    string,
    InstanceWrapper<ExceptionFilter>[]
  >();
  private readonly moduleRequestInterceptors = new Map<
    string,
    InstanceWrapper<NestInterceptor>[]
  >();
  private readonly moduleRequestGuards = new Map<
    string,
    InstanceWrapper<CanActivate>[]
  >();

  constructor(private ioAdapter: WebSocketAdapter | null = null) {}

  public setGlobalPrefix(prefix: string) {
    this.globalPrefix = prefix;
  }

  public getGlobalPrefix() {
    return this.globalPrefix;
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
    pipes.forEach(item => item != null && assertEnhancer(item, 'pipe'));
    this.globalPipes = this.globalPipes.concat(pipes);
  }

  public getGlobalFilters(): ExceptionFilter[] {
    return this.globalFilters;
  }

  public addGlobalFilter(filter: ExceptionFilter) {
    this.globalFilters.push(filter);
  }

  public useGlobalFilters(...filters: ExceptionFilter[]) {
    filters.forEach(item => item != null && warnOnInvalidFilter(item));
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
    interceptors.forEach(
      item => item != null && assertEnhancer(item, 'interceptor'),
    );
    this.globalInterceptors = this.globalInterceptors.concat(interceptors);
  }

  public getGlobalGuards(): CanActivate[] {
    return this.globalGuards;
  }

  public addGlobalGuard(guard: CanActivate) {
    this.globalGuards.push(guard);
  }

  public useGlobalGuards(...guards: CanActivate[]) {
    guards.forEach(item => item != null && assertEnhancer(item, 'guard'));
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

  public addModulePipe(moduleKey: string, pipe: PipeTransform<any>) {
    this.appendToModuleMap(this.modulePipes, moduleKey, pipe);
  }

  public getModulePipes(moduleKey: string): PipeTransform<any>[] {
    return this.modulePipes.get(moduleKey) ?? [];
  }

  public addModuleFilter(moduleKey: string, filter: ExceptionFilter) {
    this.appendToModuleMap(this.moduleFilters, moduleKey, filter);
  }

  public getModuleFilters(moduleKey: string): ExceptionFilter[] {
    return this.moduleFilters.get(moduleKey) ?? [];
  }

  public addModuleInterceptor(moduleKey: string, interceptor: NestInterceptor) {
    this.appendToModuleMap(this.moduleInterceptors, moduleKey, interceptor);
  }

  public getModuleInterceptors(moduleKey: string): NestInterceptor[] {
    return this.moduleInterceptors.get(moduleKey) ?? [];
  }

  public addModuleGuard(moduleKey: string, guard: CanActivate) {
    this.appendToModuleMap(this.moduleGuards, moduleKey, guard);
  }

  public getModuleGuards(moduleKey: string): CanActivate[] {
    return this.moduleGuards.get(moduleKey) ?? [];
  }

  public addModuleRequestPipe(
    moduleKey: string,
    wrapper: InstanceWrapper<PipeTransform>,
  ) {
    this.appendToModuleMap(this.moduleRequestPipes, moduleKey, wrapper);
  }

  public getModuleRequestPipes(
    moduleKey: string,
  ): InstanceWrapper<PipeTransform>[] {
    return this.moduleRequestPipes.get(moduleKey) ?? [];
  }

  public addModuleRequestFilter(
    moduleKey: string,
    wrapper: InstanceWrapper<ExceptionFilter>,
  ) {
    this.appendToModuleMap(this.moduleRequestFilters, moduleKey, wrapper);
  }

  public getModuleRequestFilters(
    moduleKey: string,
  ): InstanceWrapper<ExceptionFilter>[] {
    return this.moduleRequestFilters.get(moduleKey) ?? [];
  }

  public addModuleRequestInterceptor(
    moduleKey: string,
    wrapper: InstanceWrapper<NestInterceptor>,
  ) {
    this.appendToModuleMap(this.moduleRequestInterceptors, moduleKey, wrapper);
  }

  public getModuleRequestInterceptors(
    moduleKey: string,
  ): InstanceWrapper<NestInterceptor>[] {
    return this.moduleRequestInterceptors.get(moduleKey) ?? [];
  }

  public addModuleRequestGuard(
    moduleKey: string,
    wrapper: InstanceWrapper<CanActivate>,
  ) {
    this.appendToModuleMap(this.moduleRequestGuards, moduleKey, wrapper);
  }

  public getModuleRequestGuards(
    moduleKey: string,
  ): InstanceWrapper<CanActivate>[] {
    return this.moduleRequestGuards.get(moduleKey) ?? [];
  }

  private appendToModuleMap<T>(
    map: Map<string, T[]>,
    moduleKey: string,
    value: T,
  ) {
    const entries = map.get(moduleKey);
    if (entries) {
      entries.push(value);
      return;
    }
    map.set(moduleKey, [value]);
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

  public setCookieSigner(signer: CookieSigner | undefined): void {
    this.cookieSigner = signer;
  }

  public getCookieSigner(): CookieSigner | undefined {
    return this.cookieSigner;
  }
}
