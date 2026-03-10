import { DynamicModule, Module, Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { GuardsConsumer } from '@nestjs/core/guards/guards-consumer';
import { GuardsContextCreator } from '@nestjs/core/guards/guards-context-creator';
import { InterceptorsConsumer } from '@nestjs/core/interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '@nestjs/core/interceptors/interceptors-context-creator';
import { PipesConsumer } from '@nestjs/core/pipes/pipes-consumer';
import { PipesContextCreator } from '@nestjs/core/pipes/pipes-context-creator';
import { TRPC_MODULE_OPTIONS } from './constants';
import { TrpcModuleAsyncOptions, TrpcModuleOptions } from './interfaces';
import { TrpcHttpAdapter } from './trpc-http-adapter';
import { TrpcRouter } from './trpc-router';

const LIFECYCLE_PROVIDERS: Provider[] = [
  GuardsContextCreator,
  GuardsConsumer,
  InterceptorsContextCreator,
  InterceptorsConsumer,
  PipesContextCreator,
  PipesConsumer,
];

/**
 * NestJS module providing native tRPC integration.
 *
 * Use `TrpcModule.forRoot()` to register the tRPC handler with static options,
 * or `TrpcModule.forRootAsync()` for dynamic/factory-based configuration.
 *
 * @example
 * ```ts
 * @Module({
 *   imports: [
 *     TrpcModule.forRoot({ path: '/trpc' }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * @publicApi
 */
@Module({})
export class TrpcModule {
  static forRoot(options: TrpcModuleOptions = {}): DynamicModule {
    const optionsProvider: Provider = {
      provide: TRPC_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: TrpcModule,
      global: options.isGlobal ?? false,
      imports: [DiscoveryModule],
      providers: [
        optionsProvider,
        ...LIFECYCLE_PROVIDERS,
        TrpcRouter,
        TrpcHttpAdapter,
      ],
      exports: [TrpcRouter],
    };
  }

  static forRootAsync(options: TrpcModuleAsyncOptions): DynamicModule {
    const asyncOptionsProvider: Provider = {
      provide: TRPC_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };

    return {
      module: TrpcModule,
      global: options.isGlobal ?? false,
      imports: [DiscoveryModule, ...(options.imports ?? [])],
      providers: [
        asyncOptionsProvider,
        ...(options.extraProviders ?? []),
        ...LIFECYCLE_PROVIDERS,
        TrpcRouter,
        TrpcHttpAdapter,
      ],
      exports: [TrpcRouter],
    };
  }
}
